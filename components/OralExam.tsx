
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Scale, Gavel, GraduationCap, Volume2, Info, Sparkles, History, CheckCircle, Save, Star, AlertTriangle, Loader2 } from 'lucide-react';
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
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

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const OralExam: React.FC<OralExamProps> = ({ subjects, userId }) => {
  const [isActive, setIsActive] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ExamResult[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)?.name || "Direito";

  useEffect(() => {
    fetchHistory();
    return () => stopSession();
  }, [userId]);

  const fetchHistory = async () => {
    const { data } = await supabase.from('oral_exam_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const saveExamResult = async (grade: string, feedback: string) => {
    try {
      const { error } = await supabase.from('oral_exam_history').insert({
        user_id: userId,
        subject_name: selectedSubject,
        grade: grade,
        feedback: feedback
      });
      if (!error) fetchHistory();
      return "Resultado protocolado.";
    } catch (err) {
      return "Erro ao salvar.";
    }
  };

  const saveResultTool: FunctionDeclaration = {
    name: 'save_exam_result',
    parameters: {
      type: Type.OBJECT,
      description: 'Salva a nota e feedback do aluno.',
      properties: {
        grade: { type: Type.STRING },
        feedback: { type: Type.STRING },
      },
      required: ['grade', 'feedback'],
    },
  };

  const startSession = async () => {
    if (status !== 'idle') return;
    setStatus('connecting');
    setErrorMessage(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [saveResultTool] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: `Você é um Professor Catedrático da Faculdade de Direito da USP. Conduza um exame oral rigoroso sobre ${selectedSubject}. Use "Doutor". Ao final, utilize a função 'save_exam_result' para registrar a nota.`,
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
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'save_exam_result') {
                  const res = await saveExamResult(fc.args.grade as string, fc.args.feedback as string);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: res } }
                  }));
                }
              }
            }
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => { setStatus('idle'); setIsActive(false); },
          onerror: (e) => { 
            console.error(e);
            setErrorMessage("Conexão interrompida."); 
            setStatus('idle'); 
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setErrorMessage(err.name === 'NotAllowedError' ? "Microfone bloqueado." : "Erro ao iniciar bancada examinadora.");
      setStatus('idle');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setStatus('idle');
    setIsActive(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Exame Oral AI</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Defesa de tese em tempo real.</p>
        </div>
        <div className="bg-usp-gold/10 px-6 py-3 rounded-2xl border border-usp-gold/30 flex items-center gap-3">
          <GraduationCap className="text-usp-gold" />
          <span className="text-[10px] font-black uppercase text-usp-gold tracking-widest">Academia SanFran</span>
        </div>
      </header>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/30 p-6 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
           <AlertTriangle className="text-red-600 w-8 h-8 flex-shrink-0" />
           <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-tight">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2"><Scale size={14} /> Configurações</h3>
            <div className="space-y-4">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Cadeira de Exame</label>
              <select disabled={isActive} value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-sanfran-rubi/20 rounded-2xl font-bold outline-none">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden">
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Histórico</h4>
             <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {history.map(exam => (
                  <div key={exam.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{exam.subject_name}</span>
                      <span className={`text-[11px] font-black ${Number(exam.grade) >= 7 ? 'text-emerald-500' : 'text-sanfran-rubi'}`}>NOTA {exam.grade}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            {!isActive ? (
              <div className="space-y-8 relative z-10">
                <div className="w-40 h-40 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border-4 border-slate-100 dark:border-white/10 shadow-inner">
                  {status === 'connecting' ? <Loader2 className="w-16 h-16 text-sanfran-rubi animate-spin" /> : <Mic className="w-16 h-16 text-slate-300" />}
                </div>
                <button onClick={startSession} disabled={status === 'connecting'} className="px-12 py-6 bg-sanfran-rubi text-white rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-sanfran-rubiDark transition-all active:scale-95 disabled:opacity-50">
                  {status === 'connecting' ? 'Invocando Banca...' : 'Iniciar Audiência'}
                </button>
              </div>
            ) : (
              <div className="space-y-10 relative z-10 w-full">
                <div className="w-40 h-40 bg-sanfran-rubi/10 rounded-full flex items-center justify-center border-4 border-sanfran-rubi/40 mx-auto animate-pulse">
                  <Volume2 className="w-16 h-16 text-sanfran-rubi" />
                </div>
                <button onClick={stopSession} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Encerrar Sessão</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralExam;
