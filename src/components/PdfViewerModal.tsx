import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  targetPage?: number;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ isOpen, onClose, pdfUrl, targetPage }) => {
  if (!isOpen || !pdfUrl) return null;

  // Detect if we are on GitHub Pages or static host where /api proxy is unavailable
  const isStaticHost =
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('pages.dev') ||
    window.location.protocol === 'file:';

  const proxiedPdfUrl = isStaticHost
    ? pdfUrl
    : `/api/proxy-pdf?url=${encodeURIComponent(pdfUrl)}${targetPage ? `#page=${targetPage}` : ''}`;

  const embeddedViewerUrl = isStaticHost
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
    : proxiedPdfUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">Visualizador de Diário Oficial</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {targetPage ? `Navegando para a Página ${targetPage}` : 'Documento Completo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir em Nova Aba
            </a>
            <a
              href={pdfUrl}
              download="Diario-Oficial.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              BAIXAR PDF
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div className="flex-1 bg-slate-100 relative">
          <iframe
            src={embeddedViewerUrl}
            title="Diário Oficial PDF"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
