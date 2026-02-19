
import React, { useState, useEffect } from 'react';
import { MessageCircle, Globe, Flame, Skull, Check, BookOpen, Volume2, Save, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface SlangChallengeProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

interface Slang {
  id: string;
  language: LangCode;
  term: string;
  literal_meaning: string;
  actual_meaning: string;
  example_sentence: string;
  origin: string; // e.g., "UK", "Verlan", "Madrid"
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string }> = {
  en: { label: 'English', flag: '🇬🇧', color: 'bg-indigo-600' }, // Using UK flag for slang emphasis
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-blue-600' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-600' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600' }
};

const SLANG_DB: Slang[] = [
  // ENGLISH (UK/US/Internet)
  { id: 'en_1', language: 'en', term: 'Ghosting', literal_meaning: 'Agir como fantasma', actual_meaning: 'Cortar comunicação repentinamente com alguém (geralmente em namoro).', example_sentence: "I thought we had a connection, but he ended up ghosting me.", origin: 'Internet/Dating', difficulty: 'Easy' },
  { id: 'en_2', language: 'en', term: 'Innit', literal_meaning: 'Isn\'t it', actual_meaning: 'Né? / Não é? (Usado para confirmação no final da frase).', example_sentence: "It's a bit cold today, innit?", origin: 'UK Slang', difficulty: 'Medium' },
  { id: 'en_3', language: 'en', term: 'Simp', literal_meaning: 'Simpleton (abreviado)', actual_meaning: 'Alguém que faz demais por uma pessoa que não gosta dele(a). Gado.', example_sentence: "He bought her a car after one date? What a simp.", origin: 'Internet', difficulty: 'Medium' },
  { id: 'en_4', language: 'en', term: 'Tea', literal_meaning: 'Chá', actual_meaning: 'Fofoca / A verdade suculenta.', example_sentence: "Spill the tea! What happened at the party?", origin: 'Drag Culture/Gen Z', difficulty: 'Easy' },
  
  // FRENCH (Verlan/Argot)
  { id: 'fr_1', language: 'fr', term: 'Cimer', literal_meaning: 'Merci (Invertido)', actual_meaning: 'Obrigado (Gíria comum, Verlan).', example_sentence: "Cimer pour le coup de main, mec.", origin: 'Verlan', difficulty: 'Easy' },
  { id: 'fr_2', language: 'fr', term: 'Meuf', literal_meaning: 'Femme (Invertido)', actual_meaning: 'Mulher / Namorada.', example_sentence: "C'est ta meuf ?", origin: 'Verlan', difficulty: 'Medium' },
  { id: 'fr_3', language: 'fr', term: 'Kif-kif', literal_meaning: 'Igual', actual_meaning: 'A mesma coisa / Tudo igual.', example_sentence: "C'est kif-kif bourricot.", origin: 'Argot (Arabic origin)', difficulty: 'Medium' },
  { id: 'fr_4', language: 'fr', term: 'Chanmé', literal_meaning: 'Méchant (Invertido)', actual_meaning: 'Wicked / Irado / Muito legal.', example_sentence: "Ce film est chanmé !", origin: 'Verlan', difficulty: 'Medium' },

  // SPANISH (Spain/Latam)
  { id: 'es_1', language: 'es', term: 'Majo', literal_meaning: 'Bonito', actual_meaning: 'Simpático / Gente boa / Agradável (Espanha).', example_sentence: "Tu hermano es muy majo.", origin: 'Espanha', difficulty: 'Easy' },
  { id: 'es_2', language: 'es', term: 'Vale', literal_meaning: 'Ok', actual_meaning: 'Ok / Tudo bem / De acordo.', example_sentence: "¡Vale! Nos vemos luego.", origin: 'Espanha', difficulty: 'Easy' },
  { id: 'es_3', language: 'es', term: 'Tío/Tía', literal_meaning: 'Tio/Tia', actual_meaning: 'Cara / Mano / Miga (usado para amigos).', example_sentence: "¡Venga, tío, no te enfades!", origin: 'Espanha', difficulty: 'Easy' },
  { id: 'es_4', language: 'es', term: 'Fome', literal_meaning: 'Sem graça', actual_meaning: 'Chato / Entediante (Chile/Latam).', example_sentence: "La fiesta estuvo muy fome.", origin: 'Chile', difficulty: 'Medium' },

  // GERMAN
  { id: 'de_1', language: 'de', term: 'Moin', literal_meaning: 'Bom dia (encurtado)', actual_meaning: 'Oi / Olá (Usado a qualquer hora no Norte).', example_sentence: "Moin! Alles klar?", origin: 'Norte da Alemanha', difficulty: 'Medium' },
  { id: 'de_2', language: 'de', term: 'Bock haben', literal_meaning: 'Ter bode', actual_meaning: 'Estar a fim / Ter vontade de fazer algo.', example_sentence: "Ich hab keinen Bock auf Kino.", origin: 'Gíria Jovem', difficulty: 'Medium' },

  // ITALIAN
  { id: 'it_1', language: 'it', term: 'Magari', literal_meaning: 'Talvez', actual_meaning: 'Quem dera! / Tomara! (Desejo forte).', example_sentence: "Hai vinto alla lotteria? Magari!", origin: 'Comum', difficulty: 'Medium' },
  { id: 'it_2', language: 'it', term: 'Boh', literal_meaning: 'Não sei', actual_meaning: 'Não sei / Não tenho ideia (Expressão de incerteza).', example_sentence: "Dove andiamo? Boh.", origin: 'Comum', difficulty: 'Easy' }
];

const SlangChallenge: React.FC<SlangChallengeProps> = ({ userId }) => {
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [currentSlang, setCurrentSlang] = useState<Slang | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load collected slangs
  useEffect(() => {
    fetchCollected();
  }, [userId]);

  // When language changes, pick a new slang
  useEffect(() => {
    if (!loading) pickNewSlang();
  }, [currentLang, loading, collectedIds]); // Added collectedIds dependency to refresh if needed

  const fetchCollected = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('user_slang_stash').select('slang_id').eq('user_id', userId);
      if (data) {
        setCollectedIds(new Set(data.map(d => d.slang_id)));
      }
    } catch (e) {
      console.warn("Tabela user_slang_stash pode não existir.");
    } finally {
      setLoading(false);
    }
  };

  const pickNewSlang = () => {
    const langSlangs = SLANG_DB.filter(s => s.language === currentLang);
    // Prioritize uncollected
    const uncollected = langSlangs.filter(s => !collectedIds.has(s.id));
    
    if (uncollected.length > 0) {
      const random = uncollected[Math.floor(Math.random() * uncollected.length)];
      setCurrentSlang(random);
    } else {
      // If all collected, pick any random
      const random = langSlangs[Math.floor(Math.random() * langSlangs.length)];
      setCurrentSlang(random);
    }
    setIsRevealed(false);
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleCollect = async () => {
    if (!currentSlang) return;

    if (collectedIds.has(currentSlang.id)) {
        // Just skip to next
        pickNewSlang();
        return;
    }

    try {
        await supabase.from('user_slang_stash').insert({
            user_id: userId,
            slang_id: currentSlang.id,
            language: currentSlang.language,
            term: currentSlang.term,
            meaning: currentSlang.actual_meaning
        });
        
        setCollectedIds(prev => new Set(prev).add(currentSlang.id));
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        // Wait a bit then next
        setTimeout(pickNewSlang, 1500);

    } catch (e) {
        alert("Erro ao salvar no stash.");
    }
  };

  const playAudio = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Map to browser lang codes
      const langMap: Record<string, string> = { 
          'en': 'en-GB', // UK Slang pref
          'es': 'es-ES',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'it': 'it-IT'
      };
      utterance.lang = langMap[lang] || 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div></div>;

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col items-center mb-8 shrink-0">
        <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-6 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4 shadow-lg">
           <MessageCircle className="w-5 h-5 text-pink-500" />
           <span className="text-xs font-black uppercase tracking-widest text-white">Street Dictionary</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">Desafio da Gíria</h2>
        <p className="text-slate-500 font-bold">O idioma que os livros não ensinam.</p>
      </header>

      {/* LANGUAGE SELECTOR */}
      <div className="flex gap-2 justify-center mb-8">
         {(Object.keys(LANGUAGES_CONFIG) as LangCode[]).map(lc => (
            <button
               key={lc}
               onClick={() => setCurrentLang(lc)}
               className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-4 transition-all ${currentLang === lc ? `${LANGUAGES_CONFIG[lc].color} border-white shadow-xl scale-110 -translate-y-1` : 'bg-slate-100 dark:bg-white/10 border-transparent opacity-50 grayscale hover:grayscale-0'}`}
            >
               {LANGUAGES_CONFIG[lc].flag}
            </button>
         ))}
      </div>

      {/* CARD */}
      {currentSlang && (
         <div className="flex-1 flex flex-col justify-center">
             <div className="bg-white dark:bg-[#1a1a1a] rounded-[3rem] border-4 border-slate-900 dark:border-white/10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] overflow-hidden relative group">
                
                {/* Status Badge */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-20">
                   <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">{currentSlang.origin}</span>
                   {collectedIds.has(currentSlang.id) && (
                      <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1"><Check size={10} /> Coletado</span>
                   )}
                </div>

                <div className={`p-10 text-center relative z-10 transition-all duration-500 ${isRevealed ? 'pb-6' : 'py-20'}`}>
                   {/* Main Term */}
                   <h3 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 transform group-hover:scale-105 transition-transform duration-300 drop-shadow-sm">
                      {currentSlang.term}
                   </h3>
                   
                   {!isRevealed && (
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Toque para revelar</p>
                   )}

                   {/* Revealed Content */}
                   {isRevealed && (
                      <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                         <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl inline-block border-2 border-slate-200 dark:border-white/10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Significado Real</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentSlang.actual_meaning}</p>
                         </div>
                         
                         <div className="text-left bg-pink-50 dark:bg-pink-900/10 p-6 rounded-2xl border-2 border-pink-100 dark:border-pink-900/30">
                            <div className="flex justify-between items-start mb-2">
                               <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">Exemplo de Uso</span>
                               <button onClick={() => playAudio(currentSlang.example_sentence, currentSlang.language)} className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-full text-pink-600 hover:scale-110 transition-transform">
                                  <Volume2 size={16} />
                               </button>
                            </div>
                            <p className="text-xl font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed">"{currentSlang.example_sentence}"</p>
                         </div>

                         <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                            <BookOpen size={14} /> Literalmente: "{currentSlang.literal_meaning}"
                         </div>
                      </div>
                   )}
                </div>

                {/* Overlay Button for Reveal */}
                {!isRevealed && (
                   <button onClick={handleReveal} className="absolute inset-0 w-full h-full cursor-pointer z-10"></button>
                )}
             </div>

             {/* Action Buttons */}
             {isRevealed && (
                <div className="mt-8 flex gap-4 animate-in slide-in-from-bottom-8">
                   <button 
                     onClick={pickNewSlang} 
                     className="flex-1 py-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-colors"
                   >
                      Pular / Próximo
                   </button>
                   <button 
                     onClick={handleCollect} 
                     disabled={collectedIds.has(currentSlang.id)}
                     className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 ${collectedIds.has(currentSlang.id) ? 'bg-emerald-500 cursor-default' : 'bg-slate-900 dark:bg-white dark:text-slate-900'}`}
                   >
                      {collectedIds.has(currentSlang.id) ? <><Check size={16} /> Já no Stash</> : <><Save size={16} /> Salvar no Stash</>}
                   </button>
                </div>
             )}
         </div>
      )}

    </div>
  );
};

export default SlangChallenge;
