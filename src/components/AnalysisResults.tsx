import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Eye,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnalysisResponse, TopicResult, MatchOccurrence } from '../types.js';

interface AnalysisResultsProps {
  results: AnalysisResponse;
  onOpenPdfViewer: (pdfUrl: string, pageNumber?: number) => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results, onOpenPdfViewer }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | 'all'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const { edition, overallSummary, topicResults } = results;

  const totalMatchesCount = topicResults.reduce((acc, tr) => acc + (tr.found ? tr.matchCount : 0), 0);
  const foundTopicsCount = topicResults.filter((tr) => tr.found).length;

  const toggleExpand = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getRelevanceBadge = (relevance: string) => {
    switch (relevance?.toLowerCase()) {
      case 'alta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Relevância Alta
          </span>
        );
      case 'media':
      case 'médio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Relevância Média
          </span>
        );
      case 'baixa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Informativo / Baixa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
            Não encontrado
          </span>
        );
    }
  };

  const highlightKeywordInText = (text: string, keyword: string) => {
    if (!keyword) return text;
    try {
      const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-900 font-semibold px-1 rounded-xs">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  const filteredTopicResults = topicResults.filter((tr) => {
    if (selectedTopicId !== 'all' && tr.topicId !== selectedTopicId) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchName = tr.topicName.toLowerCase().includes(q);
      const matchSummary = tr.summary.toLowerCase().includes(q);
      const matchSnippet = tr.occurrences.some((occ) => occ.snippet.toLowerCase().includes(q));
      return matchName || matchSummary || matchSnippet;
    }
    return true;
  });

  return (
    <div id="analysis-results-container" className="space-y-6">
      {/* Top Banner & Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold uppercase tracking-wider">
                Análise Concluída
              </span>
              <span className="text-xs font-mono text-slate-400">• {new Date(edition.fetchedAt).toLocaleTimeString('pt-BR')}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {edition.title || 'Diário Oficial Municipal'}
            </h2>
          </div>

          <button
            onClick={() => onOpenPdfViewer(edition.pdfUrl)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Eye className="w-4 h-4" />
            ABRIR PDF COMPLETO
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Edition Detail Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Cidade / Município
            </span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">{edition.city || 'Jaguariúna - SP'}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Data da Edição
            </span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">{edition.date || 'Hoje'}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> Número da Edição / Páginas
            </span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
              {edition.editionNumber} ({edition.totalPages || 1} pág.)
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <span className="text-[10px] font-bold uppercase text-blue-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" /> Temas Detectados
            </span>
            <p className="text-xs font-bold text-blue-900 mt-0.5">
              {foundTopicsCount} de {topicResults.length} temas ({totalMatchesCount} trechos)
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary Card */}
      {overallSummary && (
        <div className="bg-slate-900 rounded-xl p-5 text-white shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Resumo Executivo do Diário Oficial (AI Gemini)
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-200 font-sans whitespace-pre-line">{overallSummary}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Ocorrências por Tema ({foundTopicsCount} encontrados)
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar nos trechos..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-64"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            onClick={() => setSelectedTopicId('all')}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
              selectedTopicId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos os Temas ({topicResults.length})
          </button>
          {topicResults.map((tr) => (
            <button
              key={tr.topicId}
              onClick={() => setSelectedTopicId(tr.topicId)}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                selectedTopicId === tr.topicId
                  ? 'bg-blue-600 text-white shadow-xs'
                  : tr.found
                  ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
            >
              <span>{tr.topicName}</span>
              {tr.found && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {tr.matchCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Results Cards */}
      <div className="space-y-4">
        {filteredTopicResults.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium">Nenhum tema ou trecho encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          filteredTopicResults.map((tr) => {
            const isExpanded = expandedTopics[tr.topicId] !== false; // expanded by default

            return (
              <div
                key={tr.topicId}
                className={`bg-white rounded-xl border transition-all ${
                  tr.found ? 'border-emerald-200 shadow-2xs' : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(tr.topicId)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/50 rounded-t-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        tr.found ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {tr.found ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{tr.topicName}</h4>
                        {getRelevanceBadge(tr.relevance)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tr.found
                          ? `${tr.matchCount} ocorrência(s) identificada(s) no documento`
                          : 'Nenhum termo encontrado nesta edição'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {tr.found && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {tr.matchCount} Trecho(s)
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Content Body */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 space-y-3">
                    {/* Summary box */}
                    {tr.summary && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 text-xs text-slate-700 border border-slate-200 leading-relaxed">
                        <span className="font-bold text-slate-900">Análise do Tema: </span>
                        {tr.summary}
                      </div>
                    )}

                    {/* Occurrences List */}
                    {tr.found && tr.occurrences.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Trechos em destaque no PDF:
                        </p>

                        {tr.occurrences.map((occ: MatchOccurrence, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold font-mono">
                                  Pág. {occ.pageNumber}
                                </span>
                                {occ.sectionContext && (
                                  <span className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    {occ.sectionContext}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() =>
                                  onOpenPdfViewer(edition.pdfUrl, typeof occ.pageNumber === 'number' ? occ.pageNumber : 1)
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                VER NO PDF
                              </button>
                            </div>

                            {/* Snippet Quote */}
                            <div className="p-3 rounded-md bg-white border border-slate-200 font-sans text-xs leading-relaxed text-slate-800">
                              "{highlightKeywordInText(occ.snippet, occ.keywordMatched)}"
                            </div>

                            {/* Explanation */}
                            {occ.explanation && (
                              <p className="text-[11px] text-slate-600 leading-normal">
                                <strong className="text-slate-800">Contexto: </strong>
                                {occ.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
