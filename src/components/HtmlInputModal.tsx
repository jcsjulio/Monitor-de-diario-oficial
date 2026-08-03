import React, { useState } from 'react';
import { X, Code2, Sparkles, AlertCircle } from 'lucide-react';

interface HtmlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessHtml: (html: string) => void;
  loading: boolean;
}

export const HtmlInputModal: React.FC<HtmlInputModalProps> = ({ isOpen, onClose, onProcessHtml, loading }) => {
  const [htmlCode, setHtmlCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlCode.trim()) return;
    onProcessHtml(htmlCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Colar Código HTML do Portal Municipal</h3>
              <p className="text-xs text-slate-500">
                Caso o site da prefeitura esteja com bloqueio de acesso direto, cole o código-fonte HTML da página aqui.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Cole o HTML exibido no navegador (Ex: Exibir Código-Fonte da página do Diário)
            </label>
            <textarea
              rows={8}
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="<html><body><a href='https://www.dioe.com.br/exibe_do.php?i=ODU6Njkz'>Diario Oficial 31/07/2026</a>...</body></html>"
              className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              O sistema irá extrair automaticamente todos os links de edições e arquivos do Diário Oficial contidos no código HTML colado.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !htmlCode.trim()}
              className="inline-flex items-center gap-1.5 text-xs px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Processando HTML...' : 'PROCESSAR HTML E EXTRAIR EDIÇÕES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
