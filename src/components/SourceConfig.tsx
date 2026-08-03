import React, { useState } from 'react';
import { Globe, Link as LinkIcon, Building2, Code2, RefreshCw, CheckCircle2, ChevronRight, FileText } from 'lucide-react';

interface SourceConfigProps {
  sourceUrl: string;
  setSourceUrl: (url: string) => void;
  directPdfUrl: string;
  setDirectPdfUrl: (url: string) => void;
  cityName: string;
  setCityName: (city: string) => void;
  onOpenHtmlModal: () => void;
  detectedEditions: { title: string; date: string; editionNumber: string; url: string }[];
  onSelectEditionPdf: (url: string) => void;
  onFetchEditions: () => void;
  loadingEditions: boolean;
}

export const SourceConfig: React.FC<SourceConfigProps> = ({
  sourceUrl,
  setSourceUrl,
  directPdfUrl,
  setDirectPdfUrl,
  cityName,
  setCityName,
  onOpenHtmlModal,
  detectedEditions,
  onSelectEditionPdf,
  onFetchEditions,
  loadingEditions,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const presets = [
    {
      name: 'Jaguariúna - Imprensa Oficial Portal',
      url: 'https://www.imprensaoficialmunicipal.com.br/jaguariuna',
      directPdf: '',
      city: 'Jaguariúna - SP',
    },
    {
      name: 'Jaguariúna - Última Edição (DIOE)',
      url: 'https://www.imprensaoficialmunicipal.com.br/jaguariuna',
      directPdf: 'https://www.dioe.com.br/exibe_do.php?i=ODU2Njkz',
      city: 'Jaguariúna - SP',
    },
    {
      name: 'Personalizado / Outro Município',
      url: '',
      directPdf: '',
      city: 'Minha Cidade',
    },
  ];

  return (
    <div id="source-config-container" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Fonte do Diário Oficial & Cidade</h2>
            <p className="text-xs text-slate-500">Configure o link do portal municipal ou link direto do PDF de qualquer cidade</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-paste-html"
            onClick={onOpenHtmlModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
            title="Se o portal exigir login ou código, cole o HTML aqui"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-500" />
            Colar Código HTML do Site
          </button>
          <button
            id="btn-toggle-edit"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            {isEditing ? 'Concluir Edição' : 'Editar Fontes / Cidade'}
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 self-center mr-1">Atalhos rápidos:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (p.url) setSourceUrl(p.url);
              setDirectPdfUrl(p.directPdf);
              if (p.city) setCityName(p.city);
            }}
            className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
              sourceUrl === p.url && directPdfUrl === p.directPdf
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* City Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Município / Cidade</label>
          <div className="relative">
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="Ex: Jaguariúna - SP"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
            />
          </div>
        </div>

        {/* Portal URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Link do Portal Diário Oficial
          </label>
          <div className="relative">
            <Globe className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.imprensaoficialmunicipal.com.br/jaguariuna"
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>

        {/* Direct PDF Link */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Link Direto do PDF (Opcional)
          </label>
          <div className="relative">
            <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="url"
              value={directPdfUrl}
              onChange={(e) => setDirectPdfUrl(e.target.value)}
              placeholder="https://www.dioe.com.br/exibe_do.php?i=ODU6Njkz"
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Detected Editions Section if fetched */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-600">
            {directPdfUrl
              ? 'Será verificada a edição selecionada diretamente no link DIOE'
              : 'Será verificada automaticamente a edição diária mais recente do portal'}
          </span>
        </div>

        <button
          onClick={onFetchEditions}
          disabled={loadingEditions}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loadingEditions ? 'animate-spin' : ''}`} />
          {loadingEditions ? 'Buscando...' : 'BUSCAR EDIÇÕES DIÁRIAS'}
        </button>
      </div>

      {/* List of Detected Editions if any */}
      {detectedEditions && detectedEditions.length > 0 && (
        <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-lg p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Edições Encontradas no Portal:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {detectedEditions.map((ed, i) => (
              <div
                key={i}
                onClick={() => onSelectEditionPdf(ed.url)}
                className={`p-2 rounded-md text-xs border cursor-pointer transition-all flex items-center justify-between ${
                  directPdfUrl === ed.url
                    ? 'bg-blue-50 border-blue-200 font-semibold text-blue-900'
                    : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                }`}
              >
                <div>
                  <p className="font-semibold">{ed.title}</p>
                  <p className="text-[11px] text-slate-500">{ed.date}</p>
                </div>
                {directPdfUrl === ed.url ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
