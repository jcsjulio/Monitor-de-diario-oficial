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
  const foundKeys = new Set<string>();
  const foundUrls = new Set<string>();

  // 1. Check if HTML contains DOSP JSON structure or callback data directly (e.g. dioe.data)
  const jsonpMatch = html.match(/(?:dioe|data)\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])/);
  if (jsonpMatch) {
    try {
      const rawJson = jsonpMatch[1];
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : parsed.data;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.iddo && item.edicao_do) {
            let iKey = String(item.iddo);
            try {
              iKey = btoa(String(item.iddo));
            } catch (e) {
              // fallback
            }

            if (foundKeys.has(iKey)) continue;
            foundKeys.add(iKey);

            const edNum = item.edicao_do;
            const isExtra = item.flag_extra == 1;
            const editionStr = `Edição nº ${edNum}${isExtra ? ' (ed. extra)' : ''}`;

            let dateStr = '';
            if (item.data) {
              const dParts = String(item.data).split(' ')[0].split('-');
              if (dParts.length === 3) {
                dateStr = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
              }
            }

            const printUrl = `https://dosp.com.br/impressao.php?i=${iKey}`;
            links.push({
              title: `${editionStr}${dateStr ? ` - ${dateStr}` : ''}`,
              date: dateStr || new Date().toLocaleDateString('pt-BR'),
              editionNumber: editionStr,
              url: printUrl,
            });
          }
        }
        if (links.length > 0) return links;
      }
    } catch (e) {
      // Fallthrough to HTML regex
    }
  }

  // 2. Strict regex matching ONLY actual gazette edition links
  const hrefRegex = /href=["']([^"']*(?:exibe_do\.php|impressao\.php|leiturajornal\.php|\.pdf)[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawUrl = match[1];

    // Ignore static assets like CSS, JS, images, fonts
    if (/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)(\?.*)?$/i.test(rawUrl)) {
      continue;
    }

    const absoluteUrl = makeAbsoluteUrl(baseUrl, rawUrl);

    // Check if URL has an edition key (i=...)
    const iMatch = absoluteUrl.match(/[?&]i=([A-Za-z0-9%=-]+)/);

    // Skip if no edition key AND not a pdf file AND not a gazette script page
    if (!iMatch && !/\.pdf($|\?)/i.test(absoluteUrl) && !/(?:exibe_do|impressao|leiturajornal)\.php/i.test(absoluteUrl)) {
      continue;
    }

    const key = iMatch ? iMatch[1] : absoluteUrl;

    if (foundKeys.has(key) || foundUrls.has(absoluteUrl)) continue;
    foundKeys.add(key);
    foundUrls.add(absoluteUrl);

    const matchIndex = match.index;
    const startContext = Math.max(0, matchIndex - 350);
    const endContext = Math.min(html.length, matchIndex + 350);
    const contextText = html.substring(startContext, endContext).replace(/<[^>]+>/g, ' ');

    // Extract Date
    const dateMatch = contextText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract Edition Number
    const edMatch =
      contextText.match(/(?:nº|n°|ed\.?|edi[çc][ãa]o|número)\s*[:.-]?\s*(\d+[A-Z]?(?:\s*\([^)]+\))?)/i) ||
      contextText.match(/\b(\d{3,5}[A-Z]?(?:\s*\(ed\.\s*extra\))?)\b/i);

    const editionNumber = edMatch ? `Edição nº ${edMatch[1]}` : 'Edição Diária';
    const displayDate = date || new Date().toLocaleDateString('pt-BR');
    const title = `${editionNumber}${date ? ` - ${date}` : ''}`;

    let targetUrl = absoluteUrl;
    if (iMatch) {
      targetUrl = `https://dosp.com.br/impressao.php?i=${iMatch[1]}`;
    }

    links.push({
      title,
      date: displayDate,
      editionNumber,
      url: targetUrl,
    });
  }

  return links;
}

/**
 * Clean HTML tags and site navigation boilerplate to extract actual gazette text
 */
function stripHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<div\s+id=["']top-header["'][\s\S]*?<\/div>/gi, '')
    .replace(/<div\s+id=["']mini-cal["'][\s\S]*?<\/div>/gi, '')
    .replace(/<section\s+id=["']widgets["'][\s\S]*?<\/section>/gi, '');

  const mainMatch =
    text.match(/<div\s+id=["']jornal["'][\s\S]*?<\/div>\s*<\/div>/i) ||
    text.match(/<div\s+id=["']dioe["'][\s\S]*?<\/div>/i) ||
    text.match(/<div\s+id=["']content-wrapper["'][\s\S]*?<\/div>/i) ||
    text.match(/<main[\s\S]*?<\/main>/i);

  if (mainMatch) {
    text = mainMatch[0];
  }

  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || '';
  } catch (e) {
    return text.replace(/<[^>]+>/g, ' ');
  }
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
