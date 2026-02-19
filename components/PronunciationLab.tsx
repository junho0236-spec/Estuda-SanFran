
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, RotateCcw, CheckCircle2, AlertCircle, RefreshCw, Trophy, Languages } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface PronunciationLabProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string, bcp47: string }> = {
  en: { label: 'English', flag: '🇺🇸', color: 'bg-blue-600', bcp47: 'en-US' },
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500', bcp47: 'es-ES' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-indigo-600', bcp47: 'fr-FR' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-600', bcp47: 'de-DE' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600', bcp47: 'it-IT' }
};

const PHRASES_DB: Record<LangCode, string[]> = {
  en: [
    "Can I have a bottle of water, please?",
    "I would like to order the chicken sandwich.",
    "Could you tell me where the nearest subway station is?",
    "I have a reservation under the name Smith.",
    "Do you accept credit cards here?",
    "What time does the museum open?",
    "I'm looking for a pharmacy.",
    "It's nice to meet you."
  ],
  es: [
    "¿Me podría dar una botella de agua, por favor?",
    "Quisiera pedir el sándwich de pollo.",
    "¿Podría decirme dónde está la estación de metro más cercana?",
    "Tengo una reserva a nombre de García.",
    "¿Aceptan tarjetas de crédito aquí?",
    "¿A qué hora abre el museo?",
    "Estoy buscando una farmacia.",
    "Mucho gusto en conocerle."
  ],
  fr: [
    "Puis-je avoir une bouteille d'eau, s'il vous plaît ?",
    "Je voudrais commander le sandwich au poulet.",
    "Pourriez-vous me dire où est la station de métro la plus proche ?",
    "J'ai une réservation au nom de Martin.",
    "Acceptez-vous les cartes de crédit ici ?",
    "À quelle heure ouvre le musée ?",
    "Je cherche une pharmacie.",
    "Enchanté de vous rencontrer."
  ],
  de: [
    "Kann ich bitte eine Flasche Wasser haben?",
    "Ich möchte das Hähnchensandwich bestellen.",
    "Könnten Sie mir sagen, wo die nächste U-Bahn-Station ist?",
    "Ich habe eine Reservierung auf den Namen Müller.",
    "Akzeptieren Sie hier Kreditkarten?",
    "Wann öffnet das Museum?",
    "Ich suche eine Apotheke.",
    "Schön, Sie kennenzulernen."
  ],
  it: [
    "Posso avere una bottiglia d'acqua, per favore?",
    "Vorrei ordinare il panino al pollo.",
    "Potrebbe dirmi dov'è la stazione della metropolitana più vicina?",
    "Ho una prenotazione a nome Rossi.",
    "Accettate carte di credito qui?",
    "A che ora apre il museo?",
    "Sto cercando una farmacia.",
    "Piacere di conoscerti."
  ]
};

const PronunciationLab: React.FC<PronunciationLabProps> = ({ userId }) => {
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [wordFeedback, setWordFeedback] = useState<{ word: string, status: 'correct' | 'missed' }[]>([]);
  const [browserSupport, setBrowserSupport] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setBrowserSupport(false);
    }
    loadNewPhrase();
  }, []);

  useEffect(() => {
    loadNewPhrase();
    setTranscript('');
    setScore(null);
    setWordFeedback([]);
  }, [currentLang]);

  const loadNewPhrase = () => {
    const list = PHRASES_DB[currentLang];
    const random = list[Math.floor(Math.random() * list.length)];
    setCurrentPhrase(random);
  };

  const startRecording = () => {
    if (!browserSupport) return;
    
    setIsRecording(true);
    setTranscript('');
    setScore(null);
    setWordFeedback([]);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.lang = LANGUAGES_CONFIG[currentLang].bcp47;
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      analyzePronunciation(text);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzePronunciation = async (spokenText: string) => {
    const targetWords = currentPhrase.toLowerCase().replace(/[.,?¡!]/g, '').split(/\s+/);
    const spokenWords = spokenText.toLowerCase().replace(/[.,?¡!]/g, '').split(/\s+/);

    let matchCount = 0;
    const feedback: { word: string, status: 'correct' | 'missed' }[] = [];

    // Simple matching algorithm (can be improved with Levenshtein distance)
    targetWords.forEach(target => {
      // Check if spoken text contains this word (loose matching)
      if (spokenWords.includes(target)) {
        matchCount++;
        feedback.push({ word: target, status: 'correct' });
      } else {
        feedback.push({ word: target, status: 'missed' });
      }
    });

    const calculatedScore = Math.round((matchCount / targetWords.length) * 100);
    setScore(calculatedScore);
    
    // Map feedback back to original case/punctuation for display? 
    // For simplicity, we'll construct the feedback using the original phrase split
    const originalWords = currentPhrase.split(' ');
    const visualFeedback = originalWords.map((word) => {
        const clean = word.toLowerCase().replace(/[.,?¡!]/g, '');
        const isMatched = spokenWords.includes(clean);
        return { word, status: isMatched ? 'correct' : 'missed' } as const;
    });
    setWordFeedback(visualFeedback);

    if (calculatedScore >= 80) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    // Save to DB (Optional Gamification)
    try {
       await supabase.from('pronunciation_scores').insert({
         user_id: userId,
         language: currentLang,
         phrase: currentPhrase,
         score: calculatedScore
       });
    } catch (e) {
       // Silent fail if table doesn't exist
    }
  };

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGES_CONFIG[currentLang].bcp47;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!browserSupport) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Navegador Não Suportado</h3>
        <p className="text-slate-500 mt-2">O recurso de reconhecimento de voz requer Google Chrome, Edge ou Safari atualizados.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/20 px-4 py-2 rounded-full border border-teal-200 dark:border-teal-800 mb-4">
              <Mic className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Feedback Instantâneo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Pronúncia Lab</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Perca o medo de falar. Treine em um ambiente seguro.</p>
        </div>
      </header>

      {/* LANGUAGE TABS */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
         {(Object.keys(LANGUAGES_CONFIG) as LangCode[]).map(lc => (
            <button
               key={lc}
               onClick={() => setCurrentLang(lc)}
               className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 ${currentLang === lc ? `${LANGUAGES_CONFIG[lc].color} text-white border-transparent shadow-xl scale-105` : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'}`}
            >
               <span className="text-xl">{LANGUAGES_CONFIG[lc].flag}</span>
               {LANGUAGES_CONFIG[lc].label}
            </button>
         ))}
      </div>

      {/* MAIN CARD */}
      <div className="flex-1 flex flex-col items-center justify-center">
         <div className="w-full bg-white dark:bg-sanfran-rubiDark/20 p-8 md:p-12 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            {/* Target Phrase */}
            <div className="mb-10 w-full">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Frase Alvo</p>
               
               {score !== null ? (
                 // Result View
                 <div className="text-2xl md:text-4xl font-serif font-medium leading-relaxed flex flex-wrap justify-center gap-2">
                    {wordFeedback.map((wf, idx) => (
                       <span key={idx} className={`${wf.status === 'correct' ? 'text-emerald-500' : 'text-red-400 line-through decoration-red-300'}`}>
                          {wf.word}
                       </span>
                    ))}
                 </div>
               ) : (
                 // Initial View
                 <h3 className="text-2xl md:text-4xl font-serif font-medium text-slate-800 dark:text-white leading-relaxed">
                    "{currentPhrase}"
                 </h3>
               )}

               <div className="mt-6 flex justify-center gap-4">
                  <button onClick={() => playAudio(currentPhrase)} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 hover:text-teal-500 transition-colors">
                     <Volume2 size={24} />
                  </button>
                  <button onClick={loadNewPhrase} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 hover:text-teal-500 transition-colors">
                     <RefreshCw size={24} />
                  </button>
               </div>
            </div>

            {/* Recording Area */}
            <div className="relative">
               {isRecording && (
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
               )}
               <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isRecording ? 'bg-red-500 text-white scale-110' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
               >
                  {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
               </button>
            </div>
            <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
               {isRecording ? 'Ouvindo...' : 'Segure para Falar'}
            </p>

            {/* Feedback Score */}
            {score !== null && (
               <div className="mt-10 animate-in slide-in-from-bottom-4 w-full max-w-sm">
                  <div className={`p-6 rounded-2xl border-2 flex items-center justify-between ${score >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/30' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500/30'}`}>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Precisão</p>
                        <h4 className="text-3xl font-black">{score}%</h4>
                     </div>
                     <div className={`p-3 rounded-full ${score >= 80 ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                        {score >= 80 ? <Trophy size={24} /> : <RefreshCw size={24} />}
                     </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                     {transcript ? `Você disse: "${transcript}"` : "Não entendi o que você disse."}
                  </p>
               </div>
            )}

         </div>
      </div>

    </div>
  );
};

export default PronunciationLab;
