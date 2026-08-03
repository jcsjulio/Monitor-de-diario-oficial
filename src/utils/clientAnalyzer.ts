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
  const hrefRegex = /href=["']([^"']*(?:exibe_do\.php|impressao\.php|leiturajornal\.php|dioe\.com\.br|dosp\.com\.br|imprensaoficialmunicipal|\.pdf)[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  const foundKeys = new Set<string>();
  const foundUrls = new Set<string>();

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const absoluteUrl = makeAbsoluteUrl(baseUrl, rawUrl);

    // Check if URL has an edition key (i=...)
    const iMatch = absoluteUrl.match(/[?&]i=([A-Za-z0-9%=-]+)/);
    const key = iMatch ? iMatch[1] : absoluteUrl;

    if (foundKeys.has(key) || foundUrls.has(absoluteUrl)) continue;
    foundKeys.add(key);
    foundUrls.add(absoluteUrl);

    const matchIndex = match.index;
    const startContext = Math.max(0, matchIndex - 350);
    const endContext = Math.min(html.length, matchIndex + 350);
    const contextText = html.substring(startContext, endContext).replace(/<[^>]+>/g, ' ');

    const dateMatch = contextText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('pt-BR');

    const editionMatch = contextText.match(/(?:edi[çc][ãa]o|ed\.?|n[ºo]?)\s*[:.-]?\s*(\d+[A-Z]?(?:\s*\([^)]+\))?)/i);
    const editionNumber = editionMatch ? `Edição nº ${editionMatch[1]}` : 'Edição Diária';

    let title = `${editionNumber} - ${date}`;

    // Prefer impressao.php if edition key exists for full PDF download
    let targetUrl = absoluteUrl;
    if (iMatch) {
      targetUrl = `https://dosp.com.br/impressao.php?i=${iMatch[1]}`;
    }

    links.push({
      title,
      date,
      editionNumber,
      url: targetUrl,
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
