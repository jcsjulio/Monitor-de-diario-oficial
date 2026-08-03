import { Topic, AnalysisResponse, EditionMetadata } from '../types';
import {
  extractEditionLinksFromHtml,
  analyzeTextClientSide,
  makeAbsoluteUrl,
  ExtractedEditionLink,
} from '../utils/clientAnalyzer';

async function fetchWithCorsFallback(url: string): Promise<string> {
  // Try direct fetch first
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    // Ignore and try CORS proxy
  }

  // Fallback to public CORS proxy for client-side static hosting
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const proxyRes = await fetch(proxyUrl);
  if (!proxyRes.ok) {
    throw new Error(`Não foi possível acessar a URL informada (${proxyRes.status})`);
  }
  return await proxyRes.text();
}

export async function checkEditionApi(params: {
  sourceUrl: string;
  targetPdfUrl?: string;
  topics: Topic[];
  rawHtml?: string;
  customCityName?: string;
}): Promise<AnalysisResponse> {
  // 1. Attempt server API
  try {
    const response = await fetch('/api/check-edition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      return await response.json();
    }

    // If server returned 405 or 404, we are on a static host like GitHub Pages
    if (response.status !== 405 && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro do servidor (${response.status})`);
    }
  } catch (err: any) {
    // If it was a non-405 server error, rethrow
    if (err.message && !err.message.includes('405') && !err.message.includes('404') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // 2. Client-side Fallback for Static Environments (e.g. GitHub Pages)
  const customCity = params.customCityName || 'Jaguariúna';
  const metadata: EditionMetadata = {
    title: `Diário Oficial - ${customCity}`,
    date: new Date().toLocaleDateString('pt-BR'),
    editionNumber: 'Edição Atual',
    sourceUrl: params.sourceUrl,
    pdfUrl: params.targetPdfUrl || params.sourceUrl,
    fetchedAt: new Date().toISOString(),
    city: customCity,
  };

  // Case A: User provided rawHtml code
  if (params.rawHtml && params.rawHtml.trim()) {
    const detectedLinks = extractEditionLinksFromHtml(params.rawHtml, params.sourceUrl);
    const result = analyzeTextClientSide(params.rawHtml, params.topics, metadata);
    result.detectedEditions = detectedLinks;
    return result;
  }

  // Case B: Try fetching sourceUrl or targetPdfUrl client-side
  const urlToFetch = params.targetPdfUrl || params.sourceUrl;
  if (urlToFetch) {
    try {
      const htmlOrText = await fetchWithCorsFallback(urlToFetch);
      const detectedLinks = extractEditionLinksFromHtml(htmlOrText, urlToFetch);
      const result = analyzeTextClientSide(htmlOrText, params.topics, metadata);
      result.detectedEditions = detectedLinks;
      return result;
    } catch (e: any) {
      console.warn('Client-side fetch failed:', e);
      throw new Error(
        `No GitHub Pages (hospedagem estática), o portal municipal bloqueia acessos externos por restrição de segurança (CORS).\n\nPara verificar esta edição no GitHub Pages:\n1. Acesse o portal no navegador\n2. Copie o código fonte da página (Ctrl+U)\n3. Clique na opção "Colar Código HTML do Site" no topo da tela.`
      );
    }
  }

  throw new Error('Nenhum conteúdo ou URL fornecida para análise.');
}

export async function extractLinksApi(params: {
  sourceUrl: string;
  rawHtml?: string;
}): Promise<{ success: boolean; detectedEditions: ExtractedEditionLink[] }> {
  try {
    const response = await fetch('/api/extract-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      return await response.json();
    }

    if (response.status !== 405 && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao extrair links da página');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('405') && !err.message.includes('404') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Client-side fallback for static site
  if (params.rawHtml && params.rawHtml.trim()) {
    const links = extractEditionLinksFromHtml(params.rawHtml, params.sourceUrl);
    return { success: true, detectedEditions: links };
  }

  if (params.sourceUrl) {
    try {
      const html = await fetchWithCorsFallback(params.sourceUrl);
      const links = extractEditionLinksFromHtml(html, params.sourceUrl);
      return { success: true, detectedEditions: links };
    } catch (e) {
      // Return empty detectedEditions gracefully
      return { success: true, detectedEditions: [] };
    }
  }

  return { success: true, detectedEditions: [] };
}
