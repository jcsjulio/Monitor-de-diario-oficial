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
 * Helper to encode DOSP internal integer ID to Base64
 */
export function encodeDospId(iddo: number | string): string {
  try {
    return Buffer.from(String(iddo)).toString('base64');
  } catch (e) {
    return String(iddo);
  }
}

/**
 * Extracts links to gazette editions from raw HTML code or fetched portal page
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
            const iKey = encodeDospId(item.iddo);
            if (foundKeys.has(iKey)) continue;
            foundKeys.add(iKey);

            const edNum = item.edicao_do;
            const isExtra = item.flag_extra == 1;
            const editionStr = `Edição nº ${edNum}${isExtra ? ' (ed. extra)' : ''}`;

            let dateStr = new Date().toLocaleDateString('pt-BR');
            if (item.data) {
              const dParts = String(item.data).split(' ')[0].split('-');
              if (dParts.length === 3) {
                dateStr = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
              }
            }

            const printUrl = `https://dosp.com.br/impressao.php?i=${iKey}`;
            links.push({
              title: `${editionStr} - ${dateStr}`,
              date: dateStr,
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

  // 2. Match links for exibe_do.php, impressao.php, leiturajornal.php, dioe.com.br, dosp.com.br, Prensaoficialmunicipal, or .pdf
  const hrefRegex = /href=["']([^"']*(?:exibe_do\.php|impressao\.php|leiturajornal\.php|dioe\.com\.br|dosp\.com\.br|imprensaoficialmunicipal|\.pdf)[^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const absoluteUrl = makeAbsoluteUrl(baseUrl, rawUrl);

    // Check if URL has an edition key (i=...)
    const iMatch = absoluteUrl.match(/[?&]i=([A-Za-z0-9%=-]+)/);
    const key = iMatch ? iMatch[1] : absoluteUrl;

    if (foundKeys.has(key) || foundUrls.has(absoluteUrl)) continue;
    foundKeys.add(key);
    foundUrls.add(absoluteUrl);

    // Context snippet around the link to extract date and title
    const matchIndex = match.index;
    const startContext = Math.max(0, matchIndex - 350);
    const endContext = Math.min(html.length, matchIndex + 350);
    const contextText = html.substring(startContext, endContext).replace(/<[^>]+>/g, ' ');

    // Extract Date DD/MM/YYYY
    const dateMatch = contextText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('pt-BR');

    // Extract Edition Number (e.g., 1918, 1915A, 1915A (ed. extra))
    const editionMatch = contextText.match(/(?:edi[çc][ãa]o|ed\.?|n[ºo]?)\s*[:.-]?\s*(\d+[A-Z]?(?:\s*\([^)]+\))?)/i);
    const editionNumber = editionMatch ? `Edição nº ${editionMatch[1]}` : 'Edição Diária';

    // Title
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
 * Attempts to fetch live editions from DOSP API if city code (e.g. 4931) is identified in portal HTML
 */
export async function fetchDospApiEditions(htmlContent: string): Promise<ExtractedEditionLink[]> {
  const codeMatch = htmlContent.match(/dioe\.js\/(\d+)/i) || htmlContent.match(/dioe\.js\/\s*["']?(\d+)/i);
  if (!codeMatch) return [];

  const cityCode = codeMatch[1];
  const apiUrl = `https://dosp.com.br/api/index.php/dioe.js/${cityCode}`;

  try {
    console.log(`[fetchDospApiEditions] Consultando API DOSP para o código do município ${cityCode}: ${apiUrl}`);
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) return [];

    const bodyText = await res.text();
    // JSONP format: dioe({...})
    const jsonMatch = bodyText.match(/dioe\(([\s\S]*)\)\s*;?$/) || bodyText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[1]);
    const items = parsed.data || [];
    const results: ExtractedEditionLink[] = [];

    for (const item of items.slice(0, 30)) {
      if (item.iddo && item.edicao_do) {
        const iKey = encodeDospId(item.iddo);
        const edNum = item.edicao_do;
        const isExtra = item.flag_extra == 1;
        const editionStr = `Edição nº ${edNum}${isExtra ? ' (ed. extra)' : ''}`;

        let dateStr = new Date().toLocaleDateString('pt-BR');
        if (item.data) {
          const dParts = String(item.data).split(' ')[0].split('-');
          if (dParts.length === 3) {
            dateStr = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
          }
        }

        results.push({
          title: `${editionStr} - ${dateStr}`,
          date: dateStr,
          editionNumber: editionStr,
          url: `https://dosp.com.br/impressao.php?i=${iKey}`,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[fetchDospApiEditions] Falha ao consultar API DOSP:', err);
    return [];
  }
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

  // If URL contains an edition key (i=...) from DOSP / Imprensa Oficial, try impressao.php first as it serves full merged PDF
  const iParamMatch = url.match(/[?&]i=([A-Za-z0-9%=-]+)/);
  if (iParamMatch && !url.includes('impressao.php')) {
    const iVal = iParamMatch[1];
    const domain = url.includes('imprensaoficialmunicipal')
      ? 'https://imprensaoficialmunicipal.com.br'
      : 'https://dosp.com.br';
    const impressaoUrl = `${domain}/impressao.php?i=${iVal}`;
    console.log(`[fetchPdfBufferFromUrl] Convertendo link para impressao.php para obter o PDF completo: ${impressaoUrl}`);
    try {
      return await fetchPdfBufferFromUrl(impressaoUrl);
    } catch (e) {
      console.warn(`[fetchPdfBufferFromUrl] Falha ao tentar impressaoUrl (${impressaoUrl}), tentando URL original:`, e);
    }
  }

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

  // If response is HTML, check if it contains an embedded PDF or iframe or DOSP link
  const htmlContent = buffer.toString('utf8');

  // Search for impressao.php?i= or exibe_do.php?i= or i= param in JS
  const htmlIParam = htmlContent.match(/[?&"']i=([A-Za-z0-9%=-]+)/);
  if (htmlIParam) {
    const iVal = htmlIParam[1];
    const domain = url.includes('imprensaoficialmunicipal')
      ? 'https://imprensaoficialmunicipal.com.br'
      : 'https://dosp.com.br';
    const impressaoUrl = `${domain}/impressao.php?i=${iVal}`;
    if (impressaoUrl !== url) {
      console.log(`[fetchPdfBufferFromUrl] Encontrado parametro i=${iVal} no HTML, tentando ${impressaoUrl}`);
      try {
        return await fetchPdfBufferFromUrl(impressaoUrl);
      } catch (err) {
        console.warn('Falha ao baixar impressaoUrl do HTML:', err);
      }
    }
  }

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
  const pdfLinkMatch = htmlContent.match(/href=["']([^"']*(?:exibe_do\.php|impressao\.php|leiturajornal\.php|\.pdf)[^"']*)["']/i);
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
