import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { createServer as createViteServer } from 'vite';
import { fetchPdfBufferFromUrl, extractEditionLinksFromHtml, fetchDospApiEditions, makeAbsoluteUrl } from './server/htmlScraper.js';
import { analyzeGazetteWithGemini } from './server/pdfAnalyzer.js';
import { Topic, EditionMetadata } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON body parsing (with large limit for rawHtml or base64 uploads)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * Proxy endpoint to allow embedding PDF in frontend without CORS issues
   */
  app.get('/api/proxy-pdf', async (req, res) => {
    try {
      const pdfUrl = req.query.url as string;
      if (!pdfUrl) {
        return res.status(400).send('URL do PDF é obrigatória.');
      }

      const { buffer, contentType } = await fetchPdfBufferFromUrl(pdfUrl);
      res.setHeader('Content-Type', contentType || 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="diario-oficial.pdf"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    } catch (error: any) {
      console.error('Erro no proxy-pdf:', error);
      return res.status(500).json({ error: error.message || 'Falha ao carregar o PDF.' });
    }
  });

  /**
   * Extract editions list from URL or raw HTML code
   */
  app.post('/api/extract-links', async (req, res) => {
    try {
      const { sourceUrl, rawHtml } = req.body;
      let htmlContent = rawHtml || '';
      let baseUrl = sourceUrl || 'https://www.imprensaoficialmunicipal.com.br/jaguariuna';

      if (!htmlContent && sourceUrl) {
        const response = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (!response.ok) {
          throw new Error(`Não foi possível acessar a URL informada (${response.status})`);
        }
        htmlContent = await response.text();
      }

      let detectedEditions = await fetchDospApiEditions(htmlContent);
      if (detectedEditions.length === 0) {
        detectedEditions = extractEditionLinksFromHtml(htmlContent, baseUrl);
      }

      return res.json({
        success: true,
        detectedEditions,
        count: detectedEditions.length,
      });
    } catch (error: any) {
      console.error('Erro em extract-links:', error);
      return res.status(500).json({ success: false, error: error.message || 'Erro ao extrair links da página.' });
    }
  });

  /**
   * Primary route: Check Official Gazette edition and analyze topics with Gemini
   */
  app.post('/api/check-edition', async (req, res) => {
    try {
      const {
        sourceUrl = 'https://www.imprensaoficialmunicipal.com.br/jaguariuna',
        targetPdfUrl,
        topics = [],
        rawHtml,
        customCityName = 'Jaguariúna',
      } = req.body;

      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Selecione pelo menos um tema/palavra-chave para monitorar.',
        });
      }

      let pdfUrlToFetch = targetPdfUrl;
      let detectedEditionsList: any[] = [];

      // If user pasted raw HTML or targetPdfUrl wasn't explicitly chosen
      if (!pdfUrlToFetch) {
        let htmlToScan = rawHtml || '';
        if (!htmlToScan && sourceUrl) {
          // If sourceUrl is already direct exibe_do link or .pdf
          if (sourceUrl.includes('exibe_do.php') || sourceUrl.endsWith('.pdf')) {
            pdfUrlToFetch = sourceUrl;
          } else {
            console.log(`[check-edition] Acessando portal: ${sourceUrl}`);
            const portalRes = await fetch(sourceUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            });
            if (portalRes.ok) {
              const contentType = portalRes.headers.get('content-type') || '';
              if (contentType.includes('pdf')) {
                pdfUrlToFetch = sourceUrl;
              } else {
                htmlToScan = await portalRes.text();
              }
            }
          }
        }

        if (!pdfUrlToFetch && htmlToScan) {
          detectedEditionsList = await fetchDospApiEditions(htmlToScan);
          if (detectedEditionsList.length === 0) {
            detectedEditionsList = extractEditionLinksFromHtml(htmlToScan, sourceUrl);
          }
          if (detectedEditionsList.length > 0) {
            pdfUrlToFetch = detectedEditionsList[0].url;
            console.log(`[check-edition] Selecionada edição mais recente identificada: ${pdfUrlToFetch}`);
          }
        }
      }

      if (!pdfUrlToFetch) {
        // Fallback default sample link if none resolved
        pdfUrlToFetch = 'https://dosp.com.br/impressao.php?i=ODU2Njkz';
      }

      // Fetch PDF Buffer
      console.log(`[check-edition] Baixando buffer do PDF: ${pdfUrlToFetch}`);
      const { buffer, finalPdfUrl } = await fetchPdfBufferFromUrl(pdfUrlToFetch);

      const editionMetadata: EditionMetadata = {
        title: `Diário Oficial - ${customCityName}`,
        date: new Date().toLocaleDateString('pt-BR'),
        editionNumber: 'Edição Atual',
        sourceUrl,
        pdfUrl: finalPdfUrl,
        fetchedAt: new Date().toISOString(),
        city: customCityName,
      };

      // Analyze PDF with Gemini
      console.log(`[check-edition] Iniciando análise com Gemini AI...`);
      const analysisResult = await analyzeGazetteWithGemini(buffer, topics, editionMetadata);

      return res.json({
        success: true,
        edition: analysisResult.editionMetadata,
        overallSummary: analysisResult.overallSummary,
        topicResults: analysisResult.topicResults,
        detectedEditions: detectedEditionsList,
      });
    } catch (error: any) {
      console.error('Erro em check-edition:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Ocorreu um erro ao verificar o Diário Oficial.',
      });
    }
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const docsPath = path.join(process.cwd(), 'docs');
    const distPath = path.join(process.cwd(), 'dist');
    const staticPath = fs.existsSync(docsPath) ? docsPath : distPath;
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
