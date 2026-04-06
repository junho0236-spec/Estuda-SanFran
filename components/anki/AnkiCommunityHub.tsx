import React from 'react';
import {
  Sparkles,
  Filter,
  Loader2,
  ShieldCheck,
  Star,
  FileDown,
  Download,
  Eye,
  Link,
} from 'lucide-react';
import type { Subject } from '../../types';

export interface PublicDeckRow {
  id: string;
  name: string;
  is_verified?: boolean;
  cards?: unknown[];
  rating?: number;
  downloads?: number;
  author_name?: string;
  author_year?: string;
  description?: string;
  subject_id?: string;
}

export interface AnkiCommunityHubProps {
  communitySearch: string;
  onCommunitySearchChange: (v: string) => void;
  isFetchingCommunity: boolean;
  publicDecks: PublicDeckRow[];
  subjects: Subject[];
  onDownloadDeck: (deck: PublicDeckRow) => void;
  onOpenPreview: (deck: PublicDeckRow) => void;
}

export const AnkiCommunityHub: React.FC<AnkiCommunityHubProps> = ({
  communitySearch,
  onCommunitySearchChange,
  isFetchingCommunity,
  publicDecks,
  subjects,
  onDownloadDeck,
  onOpenPreview,
}) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl -ml-24 -mb-24" />

      <div className="relative z-10">
        <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Hub da Comunidade</h3>
        <p className="text-purple-100 font-bold max-w-xl">
          Explore e baixe decks criados por outros estudantes da SanFran. Conhecimento compartilhado é conhecimento
          multiplicado.
        </p>
      </div>
      <Sparkles className="absolute bottom-8 right-8 w-24 h-24 text-white/10 rotate-12" />
    </div>

    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="relative flex-1 max-w-xl">
        <input
          type="text"
          placeholder="Buscar decks (ex: STF, OAB, Filosofia...)"
          value={communitySearch}
          onChange={(e) => onCommunitySearchChange(e.target.value)}
          className="w-full p-4 pl-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-purple-500 transition-all"
        />
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400">Ordenar por:</span>
        <select className="bg-transparent font-black text-xs uppercase outline-none text-slate-600 dark:text-slate-300">
          <option>Mais Baixados</option>
          <option>Mais Recentes</option>
        </select>
      </div>
    </div>

    {isFetchingCommunity ? (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-widest">Sincronizando com a nuvem...</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publicDecks
          .filter((d) => d.name.toLowerCase().includes(communitySearch.toLowerCase()))
          .map((deck) => (
            <div
              key={deck.id}
              className="group bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/5 shadow-xl hover:border-purple-500 transition-all flex flex-col justify-between h-[400px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10" />

              {deck.is_verified && (
                <div className="absolute top-6 left-6 z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-usp-gold/10 border border-usp-gold/30 rounded-full">
                    <ShieldCheck size={14} className="text-usp-gold" />
                    <span className="text-[10px] font-black text-usp-gold uppercase tracking-widest">
                      Curadoria SanFran
                    </span>
                  </div>
                </div>
              )}

              <div className={deck.is_verified ? 'mt-8' : ''}>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {deck.cards?.length || 0} Cards
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Star
                        size={14}
                        className={`transition-colors ${deck.rating != null && deck.rating >= 4 ? 'text-usp-gold fill-usp-gold' : ''}`}
                      />
                      <span className="text-[10px] font-black">{deck.rating ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <FileDown size={14} />
                      <span className="text-[10px] font-black">{deck.downloads || 0}</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase leading-tight mb-1">
                  {deck.name}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Criado por:{' '}
                  <span className="text-slate-600 dark:text-slate-300">{deck.author_name || 'Anônimo'}</span>{' '}
                  {deck.author_year && `• ${deck.author_year}`}
                </p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-3">
                  {deck.description ||
                    `Deck colaborativo criado para auxiliar nos estudos de ${(subjects || []).find((s) => s.id === deck.subject_id)?.name || 'Direito'}.`}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onDownloadDeck(deck)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-purple-500/20 transition-all"
                  >
                    <Download size={16} /> Baixar Deck
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPreview(deck)}
                    className="p-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl hover:text-purple-500 transition-all group/preview"
                    title="Ver Amostra"
                  >
                    <Eye size={18} className="group-hover/preview:scale-110 transition-transform" />
                  </button>
                </div>
                <button
                  type="button"
                  className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Link size={12} /> Copiar Link Permanente
                </button>
              </div>
            </div>
          ))}

        {publicDecks.length === 0 && (
          <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem]">
            <Sparkles className="w-16 h-16 text-slate-100 dark:text-white/5 mx-auto mb-4" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Nenhum deck público encontrado.
            </p>
          </div>
        )}
      </div>
    )}
  </div>
);
