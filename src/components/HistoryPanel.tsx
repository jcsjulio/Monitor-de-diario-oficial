import React from 'react';
import { History, Calendar, Trash2, ChevronRight, FileText, CheckCircle, MapPin } from 'lucide-react';
import { HistoryItem } from '../types.js';

interface HistoryPanelProps {
  historyItems: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyItems,
  onSelectHistoryItem,
  onClearHistory,
  onDeleteHistoryItem,
}) => {
  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 mb-6">
        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-700">Nenhuma verificação salva no histórico</p>
        <p className="text-[11px] text-slate-400 mt-1">
          As análises realizadas ficarão salvas automaticamente neste painel.
        </p>
      </div>
    );
  }

  return (
    <div id="history-panel-container" className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Histórico de Verificações Realizadas</h2>
            <p className="text-xs text-slate-500">Acesse edições verificadas anteriormente</p>
          </div>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
        >
          LIMPAR HISTÓRICO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
        {historyItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectHistoryItem(item)}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-300 transition-all cursor-pointer flex items-start justify-between gap-3 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  {item.cityName || 'Jaguariúna'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(item.timestamp).toLocaleDateString('pt-BR')} às {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                Diário Oficial - {item.editionDate || 'Edição Diária'}
              </h4>

              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                {item.overallSummary || 'Análise concluída.'}
              </p>

              <div className="mt-2 flex items-center gap-2 text-[10px] text-blue-700 font-bold">
                <CheckCircle className="w-3 h-3 text-blue-600" />
                {item.topicsFoundCount} temas com ocorrências
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteHistoryItem(item.id);
                }}
                className="p-1 text-slate-300 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                title="Excluir do histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
