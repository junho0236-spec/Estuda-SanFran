
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Scale, Gavel, GraduationCap, Volume2, Info, Sparkles, History, CheckCircle, XCircle } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Subject } from '../types';
import { supabase } from '../services/supabaseClient';

interface ExamResult {
  id: string;
  subject_name: string;
  feedback: string;
  grade: string;
  created_at: string;
}

interface OralExamProps {
  subjects: Subject[];
  userId: string;
}

const OralExam: React.FC<OralExamProps> = ({ subjects, userId }) => {
  const [isActive, setIsActive] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [history, setHistory] = useState<ExamResult[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)?.name || "Direito";

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('oral_exam_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const startSession = async () => {
    if (status !== 'idle') return;
    setStatus('connecting');
    
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: `Você é um Professor da Faculdade de Direito da USP (SanFran). Você está conduzindo um exame oral rigoroso sobre a disciplina de ${selectedSubject}. Use linguagem jurídica formal, trate o aluno como "Doutor" ou "Doutora". Faça uma pergunta por vez, ouça a resposta, avalie a precisão técnica e o fundamento legal. Importante: Se o aluno disser "Solicito Veredito", você deve parar as perguntas e dar uma nota de 0 a 10 e um feedback final curto.`,
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
              session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setStatus('idle');
            setIsActive(false);
            fetchHistory();
          },
          onerror: (e) => console.error("Erro Live API:", e)
        }
      });
      
      sessionRef.current = session;
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setStatus('idle');
    setIsActive(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Exame Oral AI</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Treine sua oratória e fundamentação jurídica.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="bg-usp-gold/10 px-6 py-3 rounded-2xl border border-usp-gold/30 flex items-center gap-3">
              <GraduationCap className="text-usp-gold" />
              <span className="text-[10px] font-black uppercase text-usp-gold tracking-widest">Academia SanFran</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
              <Scale size={14} /> Pauta da Arguição
            </h3>
            
            <div className="space-y-4">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cadeira em Exame</label>
              <select 
                disabled={isActive}
                value={selectedSubjectId} 
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-sanfran-rubi/20 rounded-2xl font-bold outline-none disabled:opacity-50"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 mt-6">
                <div className="flex items-start gap-3">
                   <Info className="text-usp-blue w-4 h-4 flex-shrink-0 mt-0.5" />
                   <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase">
                     Diga <b>"Solicito Veredito"</b> para que o professor encerre a arguição e avalie seu desempenho técnico.
                   </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Histórico de Bancas</h4>
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {history.map(exam => (
                  <div key={exam.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[100px]">{exam.subject_name}</span>
                      <span className={`text-[10px] font-black ${Number(exam.grade) >= 7 ? 'text-emerald-500' : 'text-sanfran-rubi'}`}>NOTA {exam.grade}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(exam.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {history.length === 0 && <p className="text-[9px] text-slate-400 font-black uppercase text-center py-4">Nenhum exame realizado.</p>}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Gavel size={180} /></div>

            {!isActive ? (
              <div className="space-y-8 relative z-10">
                <div className="w-32 h-32 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border-4 border-slate-50 dark:border-white/10">
                  <Mic className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Iniciar Sustentação</h4>
                  <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto mt-2 italic">A banca examinadora está pronta para ouvi-lo.</p>
                </div>
                <button 
                  onClick={startSession}
                  disabled={status === 'connecting'}
                  className="px-10 py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-sanfran-rubiDark transition-all flex items-center gap-3 mx-auto disabled:opacity-50"
                >
                  {status === 'connecting' ? 'Invocando a Banca...' : 'Abrir Audiência'}
                </button>
              </div>
            ) : (
              <div className="space-y-10 relative z-10 w-full">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-40 h-40 bg-sanfran-rubi/10 rounded-full flex items-center justify-center border-4 border-sanfran-rubi/30 animate-pulse">
                      <Volume2 className="w-16 h-16 text-sanfran-rubi" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full border-4 border-white dark:border-sanfran-rubiBlack shadow-lg">
                      <Mic className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xl font-black text-sanfran-rubi uppercase tracking-widest">Ouvindo sua Tese...</h4>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Mantenha o decoro e a clareza.</p>
                </div>
                <button 
                  onClick={stopSession}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all border-b-4 border-black"
                >
                  Encerrar Exame
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralExam;
