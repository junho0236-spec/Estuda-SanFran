
import React, { useState, useEffect } from 'react';
import { Check, X, RotateCcw, Trophy, Image as ImageIcon, Flame } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface VisualFlashcardsProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string }> = {
  en: { label: 'English', flag: '🇺🇸', color: 'bg-blue-600' },
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-indigo-600' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-600' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600' }
};

interface WordEntry {
  id: string;
  imageId: string; // Unsplash ID
  translations: Record<LangCode, string>;
}

// Banco de dados visual - IDs Unsplash selecionados para consistência
const VISUAL_DB: WordEntry[] = [
  { id: 'apple', imageId: 'photo-1560806887-1e4cd0b6cbd6', translations: { en: 'Apple', es: 'Manzana', fr: 'Pomme', de: 'Apfel', it: 'Mela' } },
  { id: 'car', imageId: 'photo-1492144534655-ae79c964c9d7', translations: { en: 'Car', es: 'Coche', fr: 'Voiture', de: 'Auto', it: 'Macchina' } },
  { id: 'dog', imageId: 'photo-1543466835-00a7907e9de1', translations: { en: 'Dog', es: 'Perro', fr: 'Chien', de: 'Hund', it: 'Cane' } },
  { id: 'book', imageId: 'photo-1544716278-ca5e3f4abd8c', translations: { en: 'Book', es: 'Libro', fr: 'Livre', de: 'Buch', it: 'Libro' } },
  { id: 'cat', imageId: 'photo-1514888286974-6c03e2ca1dba', translations: { en: 'Cat', es: 'Gato', fr: 'Chat', de: 'Katze', it: 'Gatto' } },
  { id: 'coffee', imageId: 'photo-1509042239860-f550ce710b93', translations: { en: 'Coffee', es: 'Café', fr: 'Café', de: 'Kaffee', it: 'Caffè' } },
  { id: 'house', imageId: 'photo-1570129477492-45c003edd2be', translations: { en: 'House', es: 'Casa', fr: 'Maison', de: 'Haus', it: 'Casa' } },
  { id: 'tree', imageId: 'photo-1518531933037-91b2f5f229cc', translations: { en: 'Tree', es: 'Árbol', fr: 'Arbre', de: 'Baum', it: 'Albero' } },
  { id: 'pen', imageId: 'photo-1585336261022-680e295ce3fe', translations: { en: 'Pen', es: 'Bolígrafo', fr: 'Stylo', de: 'Stift', it: 'Penna' } },
  { id: 'computer', imageId: 'photo-1587614382346-4ec70e388b28', translations: { en: 'Computer', es: 'Ordenador', fr: 'Ordinateur', de: 'Computer', it: 'Computer' } },
  { id: 'chair', imageId: 'photo-1592078615290-033ee584e267', translations: { en: 'Chair', es: 'Silla', fr: 'Chaise', de: 'Stuhl', it: 'Sedia' } },
  { id: 'sun', imageId: 'photo-1533256023340-9a25b3997635', translations: { en: 'Sun', es: 'Sol', fr: 'Soleil', de: 'Sonne', it: 'Sole' } }
];

const VisualFlashcards: React.FC<VisualFlashcardsProps> = ({ userId }) => {
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [currentCard, setCurrentCard] = useState<{ image: string, word: string, isMatch: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, [userId, currentLang]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('visual_flashcards_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('language', currentLang)
        .single();
      
      if (data) {
        setScore(data.total_score);
        setBestStreak(data.best_streak);
      } else {
        setScore(0);
        setBestStreak(0);
      }
    } catch (e) {
      // Tabela pode não existir, falhar silenciosamente
    } finally {
      generateCard();
      setLoading(false);
    }
  };

  const updateProgress = async (newScore: number, newStreak: number) => {
    try {
      const maxStreak = Math.max(bestStreak, newStreak);
      setBestStreak(maxStreak);
      
      await supabase.from('visual_flashcards_progress').upsert({
         user_id: userId,
         language: currentLang,
         total_score: newScore,
         best_streak: maxStreak,
         last_played: new Date().toISOString()
      }, { onConflict: 'user_id, language' });
    } catch (e) {}
  };

  const generateCard = () => {
    const randomEntry = VISUAL_DB[Math.floor(Math.random() * VISUAL_DB.length)];
    const isMatch = Math.random() > 0.5;
    
    let displayedWord = "";
    
    if (isMatch) {
      displayedWord = randomEntry.translations[currentLang];
    } else {
      // Pick a random incorrect word
      let wrongEntry = randomEntry;
      while (wrongEntry.id === randomEntry.id) {
        wrongEntry = VISUAL_DB[Math.floor(Math.random() * VISUAL_DB.length)];
      }
      displayedWord = wrongEntry.translations[currentLang];
    }

    setCurrentCard({
      image: `https://images.unsplash.com/${randomEntry.imageId}?w=600&h=600&fit=crop&q=80`,
      word: displayedWord,
      isMatch
    });
    setFeedback(null);
    setIsAnimating(false);
  };

  const handleAnswer = (userSaidMatch: boolean) => {
    if (!currentCard || isAnimating) return;
    setIsAnimating(true);

    const isCorrect = userSaidMatch === currentCard.isMatch;

    if (isCorrect) {
      setFeedback('correct');
      const newScore = score + 10;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      updateProgress(newScore, newStreak);
      
      if (newStreak % 5 === 0) {
         confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }

      setTimeout(() => generateCard(), 800);
    } else {
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => generateCard(), 1000);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div></div>;

  return (
    <div className="h-full flex flex-col max-w-xl mx-auto pb-10 px-4 md:px-0 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col items-center mb-6 shrink-0">
         <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar max-w-full">
            {(Object.keys(LANGUAGES_CONFIG) as LangCode[]).map(lc => (
               <button
                  key={lc}
                  onClick={() => { setCurrentLang(lc); setStreak(0); }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-4 transition-all ${currentLang === lc ? `${LANGUAGES_CONFIG[lc].color} border-white shadow-xl scale-110` : 'bg-slate-100 dark:bg-white/10 border-transparent opacity-50'}`}
               >
                  {LANGUAGES_CONFIG[lc].flag}
               </button>
            ))}
         </div>

         <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-2xl">
               <Trophy size={16} className="text-yellow-500" />
               <span className="font-black text-slate-900 dark:text-white tabular-nums">{score}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-2xl">
               <Flame size={16} className={`${streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-400'}`} />
               <span className="font-black text-slate-900 dark:text-white tabular-nums">{streak}</span>
            </div>
         </div>
      </header>

      {/* GAME CARD */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
         {currentCard && (
            <div className={`relative w-full aspect-[4/5] max-h-[500px] bg-white dark:bg-slate-900 rounded-[3rem] border-8 shadow-2xl overflow-hidden transition-all duration-300 transform ${feedback === 'correct' ? 'border-emerald-500 scale-105' : feedback === 'wrong' ? 'border-red-500 rotate-3' : 'border-white dark:border-slate-800'}`}>
               
               <img 
                 src={currentCard.image} 
                 alt="Flashcard" 
                 className="w-full h-3/5 object-cover"
               />
               
               <div className="h-2/5 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 relative z-10">
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] mb-2">Isto é um(a)...</p>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight break-all">
                     {currentCard.word}?
                  </h2>
               </div>

               {/* Feedback Overlay */}
               {feedback && (
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 animate-in zoom-in duration-200`}>
                     {feedback === 'correct' ? (
                        <Check className="w-32 h-32 text-emerald-400 drop-shadow-2xl" strokeWidth={4} />
                     ) : (
                        <X className="w-32 h-32 text-red-500 drop-shadow-2xl" strokeWidth={4} />
                     )}
                  </div>
               )}
            </div>
         )}
      </div>

      {/* CONTROLS */}
      <div className="mt-8 grid grid-cols-2 gap-6 w-full max-w-sm mx-auto">
         <button 
           onClick={() => handleAnswer(false)}
           disabled={isAnimating}
           className="h-20 rounded-[2rem] bg-red-100 dark:bg-red-900/20 border-4 border-red-500 text-red-600 dark:text-red-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
         >
            <X size={40} strokeWidth={3} />
         </button>
         
         <button 
           onClick={() => handleAnswer(true)}
           disabled={isAnimating}
           className="h-20 rounded-[2rem] bg-emerald-100 dark:bg-emerald-900/20 border-4 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
         >
            <Check size={40} strokeWidth={3} />
         </button>
      </div>

    </div>
  );
};

export default VisualFlashcards;
