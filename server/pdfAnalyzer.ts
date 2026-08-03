import { GoogleGenAI, Type } from '@google/genai';
import * as _pdfParse from 'pdf-parse';
import { Topic, TopicResult, EditionMetadata } from '../src/types.js';
import { cleanHtmlToGazetteText } from './htmlScraper.js';

const pdfParse: any = (_pdfParse as any).default || _pdfParse;

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

interface PageText {
  pageNumber: number;
  text: string;
}

export async function extractPdfTextPages(pdfBuffer: Buffer): Promise<{ fullText: string; pages: PageText[]; totalPages: number }> {
  const pages: PageText[] = [];
  let pageCounter = 1;

  const options = {
    pagerender: function (pageData: any) {
      return pageData.getTextContent().then(function (textContent: any) {
        let lastY = -1;
        let text = '';
        for (let item of textContent.items) {
          if (lastY === item.transform[5] || lastY === -1) {
            text += item.str + ' ';
          } else {
            text += '\n' + item.str + ' ';
          }
          lastY = item.transform[5];
        }
        const currentPageNum = pageCounter++;
        pages.push({
          pageNumber: currentPageNum,
          text: text.trim(),
        });
        return text;
      });
    },
  };

  let fullPdfData: any;
  try {
    fullPdfData = await pdfParse(pdfBuffer, options);
  } catch (err) {
    console.warn('Erro na renderização customizada de páginas com pdf-parse, tentando padrão:', err);
    fullPdfData = await pdfParse(pdfBuffer);
  }

  const totalPages = fullPdfData.numpages || pages.length || 1;
  const fullText = fullPdfData.text || pages.map((p) => `--- PÁGINA ${p.pageNumber} ---\n${p.text}`).join('\n\n');

  return {
    fullText,
    pages,
    totalPages,
  };
}

export async function analyzeGazetteWithGemini(
  pdfBuffer: Buffer,
  topics: Topic[],
  metadata: EditionMetadata
): Promise<{ overallSummary: string; topicResults: TopicResult[]; editionMetadata: EditionMetadata }> {
  const ai = getAiClient();

  // 1. Extract text and pages from PDF or clean HTML text
  let textData: { fullText: string; pages: PageText[]; totalPages: number };
  const isPdfFormat = pdfBuffer.length > 4 && pdfBuffer.toString('utf8', 0, 4) === '%PDF';

  if (isPdfFormat) {
    try {
      textData = await extractPdfTextPages(pdfBuffer);
    } catch (e) {
      console.error('Falha no pdf-parse, fallback para envio direto do PDF ao Gemini:', e);
      textData = { fullText: '', pages: [], totalPages: 0 };
    }
  } else {
    // Buffer contains HTML or plain text from gazette
    const rawContent = pdfBuffer.toString('utf8');
    const cleanedText = cleanHtmlToGazetteText(rawContent);
    textData = {
      fullText: cleanedText,
      pages: [{ pageNumber: 1, text: cleanedText }],
      totalPages: 1,
    };
  }

  metadata.totalPages = textData.totalPages || metadata.totalPages || 1;

  // Format active topics for prompt
  const activeTopics = topics.filter((t) => t.active);
  const topicListFormatted = activeTopics
    .map(
      (t) => `- ID: "${t.id}" | Nome: "${t.name}" | Palavras-chave: [${t.keywords.join(', ')}]`
    )
    .join('\n');

  const promptText = `
Você é um especialista em análise de Diários Oficiais de Prefeituras do Brasil.
Sua tarefa é analisar o conteúdo do Diário Oficial fornecido e verificar minuciosamente a presença dos seguintes TEMAS DE INTERESSE do usuário:

TEMAS A MONITORAR:
${topicListFormatted}

INSTRUÇÕES:
1. Analise o documento completo.
2. Identifique e extraia a data real da edição, número da edição (se disponível) e o município/cidade se constar.
3. Elabore um Resumo Executivo Geral (overallSummary) com as principais matérias, decretos, portarias, atos da prefeitura, licitações ou editais publicados.
4. Para CADA um dos temas listados, determine:
   - Se foi encontrado no documento ("found": true/false).
   - Nível de relevância: "alta" (menção direta relevante/impactante), "media", "baixa" ou "nenhuma".
   - Um resumo conciso das ocorrências encontradas para esse tema.
   - Uma lista de ocorrências (occurrences), com:
     - "topicId": ID exato do tema correspondente
     - "topicName": Nome do tema
     - "pageNumber": Número da página aproximado ou exato onde o termo/matéria foi encontrado (Ex: 3, 5, 12).
     - "snippet": Trecho verbatim/literal de 2 a 4 frases extraído do documento onde o tema aparece.
     - "keywordMatched": Palavra-chave ou expressão específica que gerou a correspondência.
     - "sectionContext": Título da seção ou secretaria (Ex: "Secretaria de Saúde - Portaria nº 123", "Comissão de Licitações - Tomada de Preços").
     - "relevance": "alta", "media" ou "baixa".
     - "explanation": Breve explicação de por que esse trecho é relevante para o tema.

Responda ESTRITAMENTE em formato JSON seguindo a estrutura solicitada.
`;

  // We can pass extracted text or PDF buffer
  let contents: any;
  if (textData.fullText && textData.fullText.length > 50) {
    // Trim if ridiculously huge (> 1M chars), though Gemini Flash handles 1M+ tokens
    const maxChars = 800000;
    const truncatedText = textData.fullText.length > maxChars ? textData.fullText.substring(0, maxChars) + '\n...[Texto truncado pelo limite de segurança]' : textData.fullText;

    contents = [
      {
        text: `DADOS DO DOCUMENTO DO DIÁRIO OFICIAL:\nTotal de Páginas: ${textData.totalPages}\n\nCONTEÚDO DO TEXTO DO PDF:\n${truncatedText}\n\n${promptText}`,
      },
    ];
  } else {
    // Pass PDF inline bytes directly to Gemini
    const base64Pdf = pdfBuffer.toString('base64');
    contents = {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          },
        },
        {
          text: promptText,
        },
      ],
    };
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      editionDate: { type: Type.STRING, description: 'Data da edição do diário oficial (ex: 02/08/2026 ou 02 de Agosto de 2026)' },
      editionNumber: { type: Type.STRING, description: 'Número da edição do Diário Oficial (ex: Edição nº 1845)' },
      city: { type: Type.STRING, description: 'Nome da cidade/município identificado (ex: Jaguariúna - SP)' },
      overallSummary: { type: Type.STRING, description: 'Resumo executivo completo das principais publicações desta edição' },
      topicResults: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topicId: { type: Type.STRING },
            topicName: { type: Type.STRING },
            found: { type: Type.BOOLEAN },
            matchCount: { type: Type.INTEGER },
            relevance: { type: Type.STRING, description: 'alta, media, baixa ou nenhuma' },
            summary: { type: Type.STRING },
            occurrences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topicId: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  pageNumber: { type: Type.INTEGER },
                  snippet: { type: Type.STRING, description: 'Citação direta em português extraída do diário' },
                  keywordMatched: { type: Type.STRING },
                  sectionContext: { type: Type.STRING },
                  relevance: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['topicId', 'topicName', 'pageNumber', 'snippet', 'keywordMatched'],
              },
            },
          },
          required: ['topicId', 'topicName', 'found', 'summary', 'occurrences'],
        },
      },
    },
    required: ['overallSummary', 'topicResults'],
  };

  const aiResponse = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema as any,
      temperature: 0.2,
    },
  });

  const responseText = aiResponse.text || '{}';
  let parsedJson: any = {};
  try {
    parsedJson = JSON.parse(responseText);
  } catch (e) {
    console.error('Erro ao converter JSON do Gemini:', e, responseText);
  }

  // Update metadata with AI-discovered info
  if (parsedJson.editionDate) metadata.date = parsedJson.editionDate;
  if (parsedJson.editionNumber) metadata.editionNumber = parsedJson.editionNumber;
  if (parsedJson.city) metadata.city = parsedJson.city;

  const topicResults: TopicResult[] = (parsedJson.topicResults || []).map((tr: any) => ({
    topicId: tr.topicId,
    topicName: tr.topicName,
    found: Boolean(tr.found),
    matchCount: tr.occurrences ? tr.occurrences.length : 0,
    relevance: tr.relevance || (tr.found ? 'alta' : 'nenhuma'),
    summary: tr.summary || '',
    occurrences: (tr.occurrences || []).map((occ: any) => ({
      topicId: occ.topicId || tr.topicId,
      topicName: occ.topicName || tr.topicName,
      pageNumber: occ.pageNumber || 1,
      snippet: occ.snippet || '',
      keywordMatched: occ.keywordMatched || '',
      sectionContext: occ.sectionContext || '',
      relevance: occ.relevance || 'media',
      explanation: occ.explanation || '',
    })),
  }));

  // Ensure all active topics are present in topicResults
  for (const topic of activeTopics) {
    if (!topicResults.some((tr) => tr.topicId === topic.id)) {
      topicResults.push({
        topicId: topic.id,
        topicName: topic.name,
        found: false,
        matchCount: 0,
        relevance: 'nenhuma',
        summary: 'Nenhum termo ou referência encontrada nesta edição.',
        occurrences: [],
      });
    }
  }

  return {
    overallSummary: parsedJson.overallSummary || 'Análise da edição concluída.',
    topicResults,
    editionMetadata: metadata,
  };
}
