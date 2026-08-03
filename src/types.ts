export interface Topic {
  id: string;
  name: string;
  keywords: string[];
  active: boolean;
  color?: string;
  category?: string;
}

export interface MatchOccurrence {
  topicId: string;
  topicName: string;
  pageNumber: number | string;
  snippet: string;
  keywordMatched: string;
  sectionContext?: string;
  relevance: 'alta' | 'media' | 'baixa';
  explanation?: string;
}

export interface TopicResult {
  topicId: string;
  topicName: string;
  found: boolean;
  matchCount: number;
  relevance: 'alta' | 'media' | 'baixa' | 'nenhuma';
  summary: string;
  occurrences: MatchOccurrence[];
}

export interface EditionMetadata {
  title?: string;
  date?: string;
  editionNumber?: string;
  totalPages?: number;
  sourceUrl: string;
  pdfUrl: string;
  fetchedAt: string;
  city?: string;
}

export interface AnalysisResponse {
  success: boolean;
  edition: EditionMetadata;
  overallSummary: string;
  topicResults: TopicResult[];
  extractedTextPreview?: string;
  detectedEditions?: {
    title: string;
    date: string;
    editionNumber: string;
    url: string;
  }[];
  error?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  cityName: string;
  editionDate: string;
  editionNumber: string;
  pdfUrl: string;
  topicsFoundCount: number;
  overallSummary: string;
  topicResults: TopicResult[];
}
