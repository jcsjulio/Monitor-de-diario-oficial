import fetch from 'node-fetch';

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
 * Extracts links to gazette editions from raw HTML code or fetched portal page
 */
export function extractEditionLinksFromHtml(html: string, baseUrl: string): ExtractedEditionLink[] {
  const links: ExtractedEditionLink[] = [];

  // 1. Search for exibe_do.php?i=... or .pdf links
  // Pattern match for links like href="exibe_do.php?i=ODU2Njkz" or href="https://www.dioe.com.br/exibe_do.php?i=..."
  const hrefRegex = /href=["']([^"']*(?:exibe_do\.php|dioe\.com\.br|\.pdf)[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  const foundUrls = new Set<string>();

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const absoluteUrl = makeAbsoluteUrl(baseUrl, rawUrl);

    if (foundUrls.has(absoluteUrl)) continue;
    foundUrls.add(absoluteUrl);

    // Context snippet around the link to extract date and title
    const matchIndex = match.index;
    const startContext = Math.max(0, matchIndex - 300);
    const endContext = Math.min(html.length, matchIndex + 300);
    const contextText = html.substring(startContext, endContext).replace(/<[^>]+>/g, ' ');

    // Extract Date DD/MM/YYYY
    const dateMatch = contextText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('pt-BR');

    // Extract Edition Number
    const editionMatch = contextText.match(/(?:edi[çc][ãa]o|ed\.?|n[ºo]?)\s*[:.-]?\s*(\d+)/i);
    const editionNumber = editionMatch ? `Edição nº ${editionMatch[1]}` : 'Edição Diária';

    // Title
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
 * Downloads URL and resolves inner PDF buffer if the page embeds a PDF
 */
export async function fetchPdfBufferFromUrl(url: string): Promise<{ buffer: Buffer; finalPdfUrl: string; contentType: string }> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/pdf,application/xhtml+xml,text/html,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  console.log(`[fetchPdfBufferFromUrl] Baixando: ${url}`);
  const response = await fetch(url, { headers, redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Falha ao acessar URL ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check if buffer starts with %PDF- header magic bytes
  if (contentType.includes('pdf') || (buffer.length > 4 && buffer.toString('utf8', 0, 4) === '%PDF')) {
    return {
      buffer,
      finalPdfUrl: url,
      contentType: 'application/pdf',
    };
  }

  // If response is HTML, check if it contains an embedded PDF or iframe
  const htmlContent = buffer.toString('utf8');

  // Search for iframe src, embed src, or direct pdf download link
  const iframeMatch = htmlContent.match(/<(?:iframe|embed|object)[^>]+(?:src|data)=["']([^"']+)["']/i);
  if (iframeMatch) {
    const innerUrl = makeAbsoluteUrl(url, iframeMatch[1]);
    if (innerUrl !== url) {
      console.log(`[fetchPdfBufferFromUrl] Redirecionando iframe PDF para: ${innerUrl}`);
      return fetchPdfBufferFromUrl(innerUrl);
    }
  }

  // Search for exibe_do or .pdf inside HTML
  const pdfLinkMatch = htmlContent.match(/href=["']([^"']*(?:exibe_do\.php|\.pdf)[^"']*)["']/i);
  if (pdfLinkMatch) {
    const innerUrl = makeAbsoluteUrl(url, pdfLinkMatch[1]);
    if (innerUrl !== url) {
      console.log(`[fetchPdfBufferFromUrl] Redirecionando link PDF interno para: ${innerUrl}`);
      return fetchPdfBufferFromUrl(innerUrl);
    }
  }

  // If still HTML and no inner PDF found, return error
  throw new Error(`A URL informada retornou uma página HTML sem PDF direto. Verifique se o link aponta para a edição específica.`);
}
