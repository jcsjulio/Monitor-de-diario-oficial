import { Topic, TopicResult, EditionMetadata, AnalysisResponse } from '../types';

export interface ExtractedEditionLink {
  title: string;
  date: string;
  editionNumber: string;
  url: string;
}

/**
 * Normalizes relative URLs into absolute URLs
 */
export function makeAbsoluteUrl(baseUrl: string, relativeOrAbsolute: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch (e) {
    if (relativeOrAbsolute.startsWith('http://') || relativeOrAbsolute.startsWith('https://')) {
      return relativeOrAbsolute;
    }
    if (baseUrl.endsWith('/') && relativeOrAbsolute.startsWith('/')) {
      return baseUrl.slice(0, -1) + relativeOrAbsolute;
    }
    return baseUrl + '/' + relativeOrAbsolute;
  }
}

/**
 * Extracts links to gazette editions from raw HTML code
 */
export function extractEditionLinksFromHtml(html: string, baseUrl: string): ExtractedEditionLink[] {
  const links: ExtractedEditionLink[] = [];
  const hrefRegex = /href=["']([^"']*(?:exibe_do\.php|dioe\.com\.br|\.pdf)[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  const foundUrls = new Set<string>();

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const absoluteUrl = makeAbsoluteUrl(baseUrl, rawUrl);

    if (foundUrls.has(absoluteUrl)) continue;
    foundUrls.add(absoluteUrl);

    const matchIndex = match.index;
    const startContext = Math.max(0, matchIndex - 300);
    const endContext = Math.min(html.length, matchIndex + 300);
    const contextText = html.substring(startContext, endContext).replace(/<[^>]+>/g, ' ');

    const dateMatch = contextText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('pt-BR');

    const editionMatch = contextText.match(/(?:edi[çc][ãa]o|ed\.?|n[ºo]?)\s*[:.-]?\s*(\d+)/i);
    const editionNumber = editionMatch ? `Edição nº ${editionMatch[1]}` : 'Edição Diária';

    let title = contextText.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!title) title = `Diário Oficial - ${date}`;

    links.push({
      title: `${editionNumber} - ${date}`,
      date,
      editionNumber,
      url: absoluteUrl,
    });
  }

  return links;
}

/**
 * Clean HTML tags to text
 */
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Client-side analysis fallback for static environments (e.g. GitHub Pages)
 */
export function analyzeTextClientSide(
  content: string,
  topics: Topic[],
  metadata: EditionMetadata
): AnalysisResponse {
  const cleanText = content.includes('<') ? stripHtml(content) : content;
  const activeTopics = topics.filter((t) => t.active);
  const topicResults: TopicResult[] = [];

  let totalMatchesFound = 0;

  for (const topic of activeTopics) {
    const occurrences: TopicResult['occurrences'] = [];

    for (const keyword of topic.keywords) {
      if (!keyword.trim()) continue;

      const escapedKw = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`([^.\\n]{0,120})(${escapedKw})([^.\\n]{0,120})`, 'gi');

      let match: RegExpExecArray | null;
      let count = 0;

      while ((match = regex.exec(cleanText)) !== null && count < 10) {
        count++;
        const before = match[1].trim();
        const kwFound = match[2];
        const after = match[3].trim();
        const snippet = `"...${before} ${kwFound} ${after}..."`;

        occurrences.push({
          topicId: topic.id,
          topicName: topic.name,
          pageNumber: 1,
          snippet: snippet.replace(/\s+/g, ' '),
          keywordMatched: keyword,
          sectionContext: `Publicação Identificada`,
          relevance: 'alta',
          explanation: `O termo "${keyword}" foi encontrado no texto do Diário Oficial.`,
        });
      }
    }

    const found = occurrences.length > 0;
    if (found) totalMatchesFound += occurrences.length;

    topicResults.push({
      topicId: topic.id,
      topicName: topic.name,
      found,
      matchCount: occurrences.length,
      relevance: found ? (occurrences.length > 2 ? 'alta' : 'media') : 'nenhuma',
      summary: found
        ? `Foram identificadas ${occurrences.length} menção(ões) relacionada(s) às palavras-chave do tema.`
        : 'Nenhuma menção encontrada para as palavras-chave deste tema nesta edição.',
      occurrences,
    });
  }

  const overallSummary = totalMatchesFound > 0
    ? `Análise cliente concluída: Foram identificadas ${totalMatchesFound} ocorrência(s) de temas monitorados no conteúdo do Diário Oficial de ${metadata.city || 'Jaguariúna'}.`
    : `Análise cliente concluída: Nenhum dos temas monitorados foi encontrado no texto analisado do Diário Oficial de ${metadata.city || 'Jaguariúna'}.`;

  return {
    success: true,
    edition: metadata,
    overallSummary,
    topicResults,
    detectedEditions: [],
  };
}
