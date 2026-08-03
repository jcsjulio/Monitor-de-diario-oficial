import React, { useState } from 'react';
import { Tag, Plus, Check, X, Sparkles, Trash2, Edit3 } from 'lucide-react';
import { Topic } from '../types.js';

interface TopicManagerProps {
  topics: Topic[];
  onAddTopic: (topic: Omit<Topic, 'id'>) => void;
  onToggleTopic: (id: string) => void;
  onDeleteTopic: (id: string) => void;
  onApplyPresetPack: (presetTopics: Omit<Topic, 'id'>[]) => void;
}

export const PRESET_PACKS = [
  {
    name: 'Licitações & Compras',
    description: 'Pregão, editais, atas de registro de preço, chamamento público, contratos',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    topics: [
      {
        name: 'Licitações e Editais',
        keywords: ['licitação', 'pregão', 'edital', 'tomada de preços', 'concorrência', 'dispensa'],
        active: true,
        category: 'Licitações',
      },
      {
        name: 'Contratos e Aditivos',
        keywords: ['contrato', 'termo aditivo', 'rescisão', 'execução orçamentária'],
        active: true,
        category: 'Licitações',
      },
    ],
  },
  {
    name: 'RH & Concursos Públicos',
    description: 'Concursos, processos seletivos, nomeações, exonerações, convocação',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    topics: [
      {
        name: 'Concursos e Seleções',
        keywords: ['concurso público', 'processo seletivo', 'edital de abertura', 'gabarito', 'homologação'],
        active: true,
        category: 'RH',
      },
      {
        name: 'Nomeações e Portarias de RH',
        keywords: ['nomeação', 'nomear', 'exoneração', 'portaria de pessoal', 'posse', 'cargo em comissão'],
        active: true,
        category: 'RH',
      },
    ],
  },
  {
    name: 'Leis, Decretos e Normas',
    description: 'Decretos municipais, leis sanccionadas, portarias e regulamentos',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    topics: [
      {
        name: 'Decretos e Leis Municipais',
        keywords: ['decreto', 'lei municipal', 'sanciona', 'promulga', 'regulamenta'],
        active: true,
        category: 'Legislação',
      },
    ],
  },
  {
    name: 'Obras, Urbanismo & Meio Ambiente',
    description: 'Loteamentos, alvarás, estudos ambientais, código de obras, desapropriação',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    topics: [
      {
        name: 'Obras e Urbanismo',
        keywords: ['obra', 'pavimentação', 'loteamento', 'alvará', 'zoneamento', 'desapropriação', 'meio ambiente'],
        active: true,
        category: 'Urbanismo',
      },
    ],
  },
  {
    name: 'Tributos & Finanças',
    description: 'IPTU, ISS, verbas, subvenções, repasses, créditos adicionais',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    topics: [
      {
        name: 'Tributos e Subvenções',
        keywords: ['iptu', 'iss', 'subvenção', 'crédito suplementar', 'repasse', 'isenção tributária'],
        active: true,
        category: 'Finanças',
      },
    ],
  },
];

export const TopicManager: React.FC<TopicManagerProps> = ({
  topics,
  onAddTopic,
  onToggleTopic,
  onDeleteTopic,
  onApplyPresetPack,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [category, setCategory] = useState('Geral');

  const handleSubmitNewTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !keywordsInput.trim()) return;

    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    onAddTopic({
      name: name.trim(),
      keywords,
      active: true,
      category: category.trim() || 'Geral',
    });

    setName('');
    setKeywordsInput('');
    setShowAddForm(false);
  };

  return (
    <div id="topic-manager-container" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Temas & Palavras-Chave Monitoradas</h2>
            <p className="text-xs text-slate-500">
              Escolha ou personalize os assuntos que o sistema deve buscar no Diário Oficial
            </p>
          </div>
        </div>

        <button
          id="btn-add-topic"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddForm ? 'CANCELAR' : 'ADICIONAR NOVO TEMA'}
        </button>
      </div>

      {/* Preset Packs Section */}
      <div className="mb-5 bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Pacotes Prontos de Temas:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PACKS.map((pack, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPresetPack(pack.topics)}
              className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all hover:bg-blue-50 bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700"
              title={pack.description}
            >
              + {pack.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add Topic Form */}
      {showAddForm && (
        <form onSubmit={handleSubmitNewTopic} className="mb-5 p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Criar Novo Tema Customizado</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nome do Tema</label>
              <input
                type="text"
                required
                placeholder="Ex: Doações e Parcerias"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Palavras-chave (separadas por vírgula)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: doação, fomento, chamamento público, convênio, parceria"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Salvar Tema
            </button>
          </div>
        </form>
      )}

      {/* Topics List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {topics.map((t) => (
          <div
            key={t.id}
            className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
              t.active
                ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                : 'bg-slate-50/70 border-slate-200/60 opacity-60'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => onToggleTopic(t.id)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    t.active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>
                <span className="text-xs font-semibold text-slate-800 truncate">{t.name}</span>
                {t.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {t.category}
                  </span>
                )}
              </div>

              {/* Keywords Pills */}
              <div className="flex flex-wrap gap-1 mt-1.5 pl-6">
                {t.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono border border-slate-200/60"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => onDeleteTopic(t.id)}
              className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
              title="Excluir tema"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
