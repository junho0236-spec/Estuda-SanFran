
import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Search, 
  Plus, 
  BookOpen, 
  Sword, 
  Shield, 
  Zap, 
  Brain,
  RotateCcw,
  CheckCircle2,
  X,
  Scroll,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Mnemonic } from '../types';
import confetti from 'canvas-confetti';

interface MnemonicsProps {
  userId: string;
}

const DEFAULT_MNEMONICS: Mnemonic[] = [
  {
    id: '1',
    acronym: 'LIMPE',
    title: 'Princípios da Adm. Pública',
    subject: 'Administrativo',
    expansion: [
      { letter: 'L', meaning: 'Legalidade' },
      { letter: 'I', meaning: 'Impessoalidade' },
      { letter: 'M', meaning: 'Moralidade' },
      { letter: 'P', meaning: 'Publicidade' },
      { letter: 'E', meaning: 'Eficiência' }
    ],
    description: 'Art. 37 da Constituição Federal.'
  },
  {
    id: '2',
    acronym: 'SOCIDIVAPLU',
    title: 'Fundamentos da República',
    subject: 'Constitucional',
    expansion: [
      { letter: 'SO', meaning: 'Soberania' },
      { letter: 'CI', meaning: 'Cidadania' },
      { letter: 'DI', meaning: 'Dignidade da Pessoa Humana' },
      { letter: 'VA', meaning: 'Valores Sociais do Trabalho' },
      { letter: 'PLU', meaning: 'Pluralismo Político' }
    ],
    description: 'Art. 1º da Constituição Federal.'
  },
  {
    id: '3',
    acronym: 'MP3',
    title: 'Cargos Privativos de Brasileiro Nato',
    subject: 'Constitucional',
    expansion: [
      { letter: 'M', meaning: 'Ministro do STF' },
      { letter: 'P', meaning: 'Presidente e Vice da República' },
      { letter: 'P', meaning: 'Presidente da Câmara dos Deputados' },
      { letter: 'P', meaning: 'Presidente do Senado Federal' },
      { letter: 'C', meaning: 'Carreira Diplomática' },
      { letter: 'O', meaning: 'Oficial das Forças Armadas' },
      { letter: 'M', meaning: 'Ministro de Estado da Defesa' }
    ],
    description: 'Art. 12, §3º da CF. (MP3.COM)'
  },
  {
    id: '4',
    acronym: 'COFIFOMOB',
    title: 'Requisitos do Ato Administrativo',
    subject: 'Administrativo',
    expansion: [
      { letter: 'CO', meaning: 'Competência' },
      { letter: 'FI', meaning: 'Finalidade' },
      { letter: 'FO', meaning: 'Forma' },
      { letter: 'M', meaning: 'Motivo' },
      { letter: 'OB', meaning: 'Objeto' }
    ]
  }
];

const SUBJECTS = ['Todos', 'Constitucional', 'Administrativo', 'Penal', 'Civil', 'Processual'];

const Mnemonics: React.FC<MnemonicsProps> = ({ userId }) => {
  const [mnemonics, setMnemonics] = useState<Mnemonic[]>([]);
  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'vault' | 'practice'>('vault');
  const [practiceCard, setPracticeCard] = useState<Mnemonic | null>(null);
  const [practiceInput, setPracticeInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hoveredLetter, setHoveredLetter] = useState<{ id: string, letterIdx: number } | null>(null);

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newAcronym, setNewAcronym] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Constitucional');
  const [newDesc, setNewDesc] = useState('');
  // Simple expansion input: "L:Legalidade, I:Impessoalidade"
  const [expansionString, setExpansionString] = useState('');

  useEffect(() => {
    fetchMnemonics();
  }, []);

  const fetchMnemonics = async () => {
    try {
      const { data } = await supabase.from('mnemonics').select('*');
      if (data && data.length > 0) {
        setMnemonics([...DEFAULT_MNEMONICS, ...data]); // Merge defaults with DB
      } else {
        setMnemonics(DEFAULT_MNEMONICS);
      }
    } catch (e) {
      setMnemonics(DEFAULT_MNEMONICS);
    }
  };

  const handleCreate = async () => {
    if (!newAcronym || !newTitle || !expansionString) return;

    // Parse expansion string
    const expansion = expansionString.split(',').map(pair => {
      const [l, m] = pair.split(':');
      return { letter: l.trim().toUpperCase(), meaning: m ? m.trim() : '' };
    }).filter(e => e.letter && e.meaning);

    const newMnemonic = {
      acronym: newAcronym.toUpperCase(),
      title: newTitle,
      subject: newSubject,
      description: newDesc,
      expansion,
      user_id: userId
    };

    try {
      await supabase.from('mnemonics').insert(newMnemonic);
      setMnemonics(prev => [...prev, { ...newMnemonic, id: Math.random().toString() }]); // Optimistic
      setIsCreating(false);
      setNewAcronym(''); setNewTitle(''); setExpansionString(''); setNewDesc('');
    } catch (e) {
      alert("Erro ao salvar.");
    }
  };

  const startPractice = () => {
    const random = mnemonics[Math.floor(Math.random() * mnemonics.length)];
    setPracticeCard(random);
    setPracticeInput('');
    setFeedback(null);
    setIsRevealed(false);
    setMode('practice');
  };

  const checkAnswer = () => {
    if (!practiceCard) return;
    if (practiceInput.toUpperCase().trim() === practiceCard.acronym.toUpperCase().trim()) {
      setFeedback('correct');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setFeedback('wrong');
    }
    setIsRevealed(true);
  };

  const filteredMnemonics = mnemonics.filter(m => {
    const matchesFilter = filter === 'Todos' || m.subject === filter;
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.acronym.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4 shadow-lg">
              <Key className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">The Vault</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Mnemônica</h2>
           <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mt-2 italic max-w-lg">
             Equipe feitiços de memória. Decore o impossível com siglas de poder.
           </p>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={() => setMode('vault')}
             className={`px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${mode === 'vault' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
           >
             Grimório
           </button>
           <button 
             onClick={startPractice}
             className={`px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${mode === 'practice' ? 'bg-amber-500 text-white shadow-xl' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-amber-500'}`}
           >
             <Sword size={14} /> Treinar
           </button>
        </div>
      </header>

      {mode === 'vault' && (
         <div className="space-y-6 animate-in slide-in-from-bottom-4">
            
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
               <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {SUBJECTS.map(subj => (
                     <button
                        key={subj}
                        onClick={() => setFilter(subj)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === subj ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10'}`}
                     >
                        {subj}
                     </button>
                  ))}
               </div>
               
               <div className="flex gap-2">
                  <div className="bg-white dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-2 flex-1 md:w-64">
                     <Search size={16} className="text-slate-400" />
                     <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar macete..."
                        className="bg-transparent outline-none text-xs font-bold text-slate-700 dark:text-white w-full"
                     />
                  </div>
                  <button onClick={() => setIsCreating(true)} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 transition-transform shadow-lg">
                     <Plus size={18} />
                  </button>
               </div>
            </div>

            {/* Creation Form */}
            {isCreating && (
               <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título (ex: Princípios da Adm.)" className="p-3 rounded-xl bg-white dark:bg-black/20 text-xs font-bold border border-slate-200 dark:border-white/10" />
                  <input value={newAcronym} onChange={e => setNewAcronym(e.target.value)} placeholder="Sigla (ex: LIMPE)" className="p-3 rounded-xl bg-white dark:bg-black/20 text-xs font-bold border border-slate-200 dark:border-white/10 uppercase" />
                  <input value={expansionString} onChange={e => setExpansionString(e.target.value)} placeholder="Expansão (L:Legalidade, I:Impessoalidade...)" className="p-3 rounded-xl bg-white dark:bg-black/20 text-xs font-bold border border-slate-200 dark:border-white/10 md:col-span-2" />
                  <div className="flex gap-2 md:col-span-2">
                     <button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-xs font-bold text-slate-500">Cancelar</button>
                     <button onClick={handleCreate} className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg">Criar Feitiço</button>
                  </div>
               </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredMnemonics.map(m => (
                  <div key={m.id} className="group relative bg-[#1e293b] rounded-[2.5rem] p-1 border-2 border-slate-700 hover:border-amber-500 transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] overflow-hidden">
                     {/* Inner Card */}
                     <div className="bg-[#0f172a] h-full rounded-[2.2rem] p-6 flex flex-col items-center text-center relative z-10">
                        <div className="mb-6">
                           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-2">{m.subject}</span>
                           <h3 className="text-sm font-bold text-slate-300">{m.title}</h3>
                        </div>

                        {/* Acronym Display */}
                        <div className="flex flex-wrap justify-center gap-1 mb-8">
                           {m.expansion.map((item, idx) => (
                              <div 
                                 key={idx}
                                 className="relative"
                                 onMouseEnter={() => setHoveredLetter({ id: m.id, letterIdx: idx })}
                                 onMouseLeave={() => setHoveredLetter(null)}
                              >
                                 <span className="text-3xl md:text-4xl font-black text-amber-500 cursor-help hover:text-white transition-colors drop-shadow-md">
                                    {item.letter}
                                 </span>
                                 
                                 {/* Hover Tooltip */}
                                 <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-xl whitespace-nowrap transition-all duration-200 pointer-events-none z-20 ${hoveredLetter?.id === m.id && hoveredLetter?.letterIdx === idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                    {item.meaning}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="mt-auto w-full pt-4 border-t border-white/5">
                           <p className="text-[10px] text-slate-500 leading-relaxed italic line-clamp-2">
                              {m.description || "Passe o mouse para revelar o conteúdo."}
                           </p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {mode === 'practice' && practiceCard && (
         <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 max-w-xl mx-auto">
            <div className="w-full bg-[#1e293b] p-8 rounded-[3rem] border-4 border-slate-700 shadow-2xl relative overflow-hidden text-center">
               
               {/* Question Side */}
               <div className="mb-10">
                  <div className="inline-flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full mb-6">
                     <Brain size={14} className="text-amber-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desafio de Memória</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-4">{practiceCard.title}</h3>
                  <div className="space-y-2 text-slate-300 text-sm font-medium bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                     {practiceCard.expansion.map((exp, idx) => (
                        <div key={idx} className="flex justify-center gap-2">
                           <span className="w-6 text-right font-black text-slate-500">?</span>
                           <span>:</span>
                           <span className="text-left">{exp.meaning}</span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Input Side */}
               <div className="space-y-6">
                  <input 
                     value={practiceInput}
                     onChange={e => setPracticeInput(e.target.value)}
                     placeholder="Digite a sigla..."
                     className={`w-full p-4 bg-slate-900 border-2 rounded-2xl text-center text-xl font-black uppercase outline-none transition-all ${
                        feedback === 'correct' ? 'border-emerald-500 text-emerald-500' :
                        feedback === 'wrong' ? 'border-red-500 text-red-500' :
                        'border-slate-600 text-white focus:border-amber-500'
                     }`}
                     disabled={isRevealed}
                  />

                  {!isRevealed ? (
                     <div className="flex gap-4">
                        <button onClick={() => setIsRevealed(true)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-700 flex items-center justify-center gap-2">
                           <Eye size={16} /> Revelar
                        </button>
                        <button onClick={checkAnswer} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-600">
                           Confirmar
                        </button>
                     </div>
                  ) : (
                     <div className="animate-in fade-in">
                        <p className="text-4xl font-black text-amber-500 mb-6 tracking-widest">{practiceCard.acronym}</p>
                        <button onClick={startPractice} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs hover:bg-slate-700 flex items-center justify-center gap-2">
                           <RotateCcw size={16} /> Próximo
                        </button>
                     </div>
                  )}
               </div>

            </div>
         </div>
      )}

    </div>
  );
};

export default Mnemonics;
