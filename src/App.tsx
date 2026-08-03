import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  Building2,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  History as HistoryIcon,
  Tag,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Topic, AnalysisResponse, HistoryItem } from './types';
import { checkEditionApi, extractLinksApi } from './services/api';
import { SourceConfig } from './components/SourceConfig';
import { TopicManager, PRESET_PACKS } from './components/TopicManager';
import { AnalysisResults } from './components/AnalysisResults';
import { HtmlInputModal } from './components/HtmlInputModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { HistoryPanel } from './components/HistoryPanel';

const INITIAL_TOPICS: Topic[] = [
  {
    id: 't-1',
    name: 'Licitações e Editais',
    keywords: ['licitação', 'pregão', 'edital', 'tomada de preços', 'concorrência', 'dispensa de licitação'],
    active: true,
    category: 'Licitações',
  },
  {
    id: 't-2',
    name: 'Concursos & Nomeações',
    keywords: ['concurso público', 'processo seletivo', 'nomeação', 'nomear', 'exoneração', 'convocação'],
    active: true,
    category: 'RH',
  },
  {
    id: 't-3',
    name: 'Decretos & Leis',
    keywords: ['decreto', 'lei municipal', 'portaria', 'sanciona', 'regulamenta'],
    active: true,
    category: 'Legislação',
  },
  {
    id: 't-4',
    name: 'Obras, Urbanismo & Loteamento',
    keywords: ['obra', 'pavimentação', 'zoneamento', 'alvará', 'loteamento', 'desapropriação'],
    active: true,
    category: 'Urbanismo',
  },
  {
    id: 't-5',
    name: 'IPTU, Verbas & Subvenções',
    keywords: ['iptu', 'subvenção', 'crédito suplementar', 'repasse', 'isenção tributária', 'convênio'],
    active: true,
    category: 'Finanças',
  },
];

export default function App() {
  const [sourceUrl, setSourceUrl] = useState('https://www.imprensaoficialmunicipal.com.br/jaguariuna');
  const [directPdfUrl, setDirectPdfUrl] = useState('https://www.dioe.com.br/exibe_do.php?i=ODU2Njkz');
  const [cityName, setCityName] = useState('Jaguariúna - SP');

  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = localStorage.getItem('diario_topics');
      return saved ? JSON.parse(saved) : INITIAL_TOPICS;
    } catch (e) {
      return INITIAL_TOPICS;
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('diario_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [detectedEditions, setDetectedEditions] = useState<{ title: string; date: string; editionNumber: string; url: string }[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);

  // Modals
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState('');
  const [pdfModalPage, setPdfModalPage] = useState<number | undefined>(undefined);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'verify' | 'topics' | 'history'>('verify');

  // Persist topics and history in localStorage
  useEffect(() => {
    localStorage.setItem('diario_topics', JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem('diario_history', JSON.stringify(history));
  }, [history]);

  // Fetch editions list on initial load or sourceUrl change
  const handleFetchEditions = async (customRawHtml?: string) => {
    setLoadingEditions(true);
    setErrorMessage(null);
    try {
      const data = await extractLinksApi({
        sourceUrl,
        rawHtml: customRawHtml,
      });
      if (data.detectedEditions) {
        setDetectedEditions(data.detectedEditions);
        if (data.detectedEditions.length > 0 && !directPdfUrl) {
          setDirectPdfUrl(data.detectedEditions[0].url);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar edições:', err);
    } finally {
      setLoadingEditions(false);
    }
  };

  // Main verification handler
  const handleVerifyEdition = async (customTargetUrl?: string, customRawHtml?: string) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusStep('Conectando ao portal do Diário Oficial...');

    try {
      const targetPdfUrlToUse = customTargetUrl || directPdfUrl;

      setTimeout(() => {
        setStatusStep('Baixando a edição em PDF e extraindo páginas...');
      }, 1200);

      setTimeout(() => {
        setStatusStep('Analisando minuciosamente com Inteligência Artificial Gemini...');
      }, 3000);

      const result = await checkEditionApi({
        sourceUrl,
        targetPdfUrl: targetPdfUrlToUse,
        topics: topics.filter((t) => t.active),
        rawHtml: customRawHtml,
        customCityName: cityName,
      });

      if (!result.success) {
        throw new Error(result.error || 'Não foi possível analisar o diário oficial.');
      }

      setAnalysisResult(result);
      if (result.detectedEditions && result.detectedEditions.length > 0) {
        setDetectedEditions(result.detectedEditions);
      }

      // Save to history
      const foundTopicsCount = result.topicResults.filter((tr) => tr.found).length;
      const historyItem: HistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        cityName: result.edition.city || cityName,
        editionDate: result.edition.date || 'Hoje',
        editionNumber: result.edition.editionNumber || 'Edição Atual',
        pdfUrl: result.edition.pdfUrl,
        topicsFoundCount: foundTopicsCount,
        overallSummary: result.overallSummary,
        topicResults: result.topicResults,
      };

      setHistory((prev) => [historyItem, ...prev.slice(0, 19)]); // Keep last 20
      setActiveTab('verify');
    } catch (err: any) {
      console.error('Erro na verificação:', err);
      setErrorMessage(err.message || 'Falha ao processar o Diário Oficial. Verifique o link fornecido.');
    } finally {
      setLoading(false);
      setStatusStep('');
    }
  };

  // Process raw HTML input from modal
  const handleProcessHtml = (htmlContent: string) => {
    setIsHtmlModalOpen(false);
    handleFetchEditions(htmlContent);
    handleVerifyEdition(undefined, htmlContent);
  };

  // Open PDF viewer modal at specific page
  const handleOpenPdfViewer = (url: string, pageNumber?: number) => {
    setPdfModalUrl(url);
    setPdfModalPage(pageNumber);
    setIsPdfModalOpen(true);
  };

  // Topic Actions
  const handleAddTopic = (newTopicData: Omit<Topic, 'id'>) => {
    const newTopic: Topic = {
      ...newTopicData,
      id: `t-${Date.now()}`,
    };
    setTopics((prev) => [...prev, newTopic]);
  };

  const handleToggleTopic = (id: string) => {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));
  };

  const handleDeleteTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const handleApplyPresetPack = (presetTopics: Omit<Topic, 'id'>[]) => {
    const newTopicsToAdd: Topic[] = presetTopics.map((pt, idx) => ({
      ...pt,
      id: `preset-${Date.now()}-${idx}`,
    }));

    setTopics((prev) => {
      // Avoid duplicate names
      const existingNames = new Set(prev.map((t) => t.name.toLowerCase()));
      const filteredNew = newTopicsToAdd.filter((t) => !existingNames.has(t.name.toLowerCase()));
      return [...prev, ...filteredNew];
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Navbar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Monitor de Diário Oficial
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold border border-blue-100">
                  {cityName}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Verificação inteligente de edições diárias por temas • Desenvolvido por Julio (wjcsjulio)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status do Monitor</p>
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
              </p>
            </div>

            <button
              onClick={() => handleVerifyEdition()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'VERIFICANDO...' : 'VERIFICAR EDIÇÃO DO DIA'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('verify')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'verify'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4 text-white" />
              Painel de Verificação
            </button>

            <button
              onClick={() => setActiveTab('topics')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'topics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Tag className="w-4 h-4 text-white" />
              Temas ({topics.filter((t) => t.active).length} ativos)
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <HistoryIcon className="w-4 h-4 text-white" />
              Histórico ({history.length})
            </button>
          </nav>

          <span className="text-xs text-slate-400 font-medium hidden md:inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Extrator & Leitor Oficial de PDFs
          </span>
        </div>

        {/* Tab Views */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            {/* Source Link & City Configuration Section */}
            <SourceConfig
              sourceUrl={sourceUrl}
              setSourceUrl={setSourceUrl}
              directPdfUrl={directPdfUrl}
              setDirectPdfUrl={setDirectPdfUrl}
              cityName={cityName}
              setCityName={setCityName}
              onOpenHtmlModal={() => setIsHtmlModalOpen(true)}
              detectedEditions={detectedEditions}
              onSelectEditionPdf={(pdfUrl) => {
                setDirectPdfUrl(pdfUrl);
                handleVerifyEdition(pdfUrl);
              }}
              onFetchEditions={() => handleFetchEditions()}
              loadingEditions={loadingEditions}
            />

            {/* Verification Action Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Análise Automática sem Baixar PDF
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Verificar edição do Diário Oficial de {cityName}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O sistema acessará o portal municipal, baixará o documento em segundo plano e identificará em quais páginas aparecem os temas configurados.
                </p>
              </div>

              <button
                onClick={() => handleVerifyEdition()}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wider transition-all shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'ANALISANDO EDIÇÃO...' : 'EXECUTAR VERIFICAÇÃO AGORA'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Status Loading Spinner */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-xl border border-blue-200 p-8 shadow-xs text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Processando Diário Oficial...</h3>
                    <p className="text-xs text-blue-600 font-medium mt-1 animate-pulse">{statusStep}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Isso pode levar alguns segundos enquanto o documento é lido e analisado pela IA.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Ocorreu um problema ao verificar a edição:</p>
                  <p>{errorMessage}</p>
                  <p className="text-[11px] text-rose-600">
                    Dica: Verifique se o link está correto ou use a opção "Colar Código HTML do Site" no topo.
                  </p>
                </div>
              </div>
            )}

            {analysisResult ? (
              <AnalysisResults results={analysisResult} onOpenPdfViewer={handleOpenPdfViewer} />
            ) : (
              !loading && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Nenhuma verificação realizada ainda</h3>
                    <p className="text-xs text-slate-500">
                      Clique no botão "Executar Verificação Agora" para analisar a edição diária do Diário Oficial de {cityName}.
                    </p>
                  </div>
                  <button
                    onClick={() => handleVerifyEdition()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    Iniciar Primeira Análise
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'topics' && (
          <TopicManager
            topics={topics}
            onAddTopic={handleAddTopic}
            onToggleTopic={handleToggleTopic}
            onDeleteTopic={handleDeleteTopic}
            onApplyPresetPack={handleApplyPresetPack}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPanel
            historyItems={history}
            onSelectHistoryItem={(item) => {
              setAnalysisResult({
                success: true,
                edition: {
                  title: `Diário Oficial - ${item.cityName}`,
                  date: item.editionDate,
                  editionNumber: item.editionNumber,
                  pdfUrl: item.pdfUrl,
                  sourceUrl: sourceUrl,
                  fetchedAt: item.timestamp,
                  city: item.cityName,
                },
                overallSummary: item.overallSummary,
                topicResults: item.topicResults,
              });
              setActiveTab('verify');
            }}
            onClearHistory={() => setHistory([])}
            onDeleteHistoryItem={(id) => setHistory((prev) => prev.filter((h) => h.id !== id))}
          />
        )}
      </main>

      {/* Modals */}
      <HtmlInputModal
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
        onProcessHtml={handleProcessHtml}
        loading={loading}
      />

      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={pdfModalUrl}
        targetPage={pdfModalPage}
      />

      {/* Footer / Status Bar */}
      <footer className="h-9 bg-slate-900 border-t border-slate-800 flex items-center px-6 justify-between mt-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Sistema Online</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-700"></div>
          <span className="text-[10px] text-slate-400 font-mono">{cityName} — Monitor Ativo</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono hidden sm:flex items-center gap-2">
          <span>Monitor de Diário Oficial v2.1</span>
          <span className="text-slate-700">•</span>
          <span className="text-blue-400 font-medium">Dev: Julio (wjcsjulio)</span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-500">Powered by Gemini AI</span>
        </div>
      </footer>
    </div>
  );
}
