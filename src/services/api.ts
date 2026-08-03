import { Topic, AnalysisResponse } from '../types';

export async function checkEditionApi(params: {
  sourceUrl: string;
  targetPdfUrl?: string;
  topics: Topic[];
  rawHtml?: string;
  customCityName?: string;
}): Promise<AnalysisResponse> {
  const response = await fetch('/api/check-edition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro de servidor (${response.status})`);
  }

  return response.json();
}

export async function extractLinksApi(params: {
  sourceUrl: string;
  rawHtml?: string;
}): Promise<{ success: boolean; detectedEditions: { title: string; date: string; editionNumber: string; url: string }[] }> {
  const response = await fetch('/api/extract-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao extrair links da página');
  }

  return response.json();
}
