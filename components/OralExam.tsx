
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Scale, Gavel, GraduationCap, Volume2, Info, Sparkles, History, CheckCircle, Save, Star } from 'lucide-react';
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
    const { data } = await supabase
      .from('oral_exam_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
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
      return "Resultado protocolado com sucesso no sistema SanFran.";
    } catch (err) {
      return "Erro ao salvar no banco de dados.";
    }
  };

  const saveResultTool: FunctionDeclaration = {
    name: 'save_exam_result',
    parameters: {
      type: Type.OBJECT,
      description: 'Salva o resultado final (nota e feedback) da arguição oral do aluno no banco de dados.',
      properties: {
        grade: { type: Type.STRING, description: 'Nota de 0 a 10 atribuída ao aluno.' },
        feedback: { type: Type.STRING, description: 'Um breve parecer técnico sobre o desempenho do aluno.' },
      },
      required: ['grade', 'feedback'],
    },
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
          tools: [{ functionDeclarations: [saveResultTool] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: `Você é um Professor da Faculdade de Direito da USP (SanFran). Você conduz um exame oral sobre ${selectedSubject}. Use linguagem jurídica formal ("Doutor"). Ao final, quando o aluno solicitar o veredito ou você decidir encerrar, você DEVE chamar a função 'save_exam_result' com a nota e o feedback ANTES de se despedir por áudio.`,
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
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'save_exam_result') {
                  const res = await saveExamResult(fc.args.grade as string, fc.args.feedback as string);
                  session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: res } } });
                }
              }
            }

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
            }
          },
          onclose: () => { setStatus('idle'); setIsActive(false); fetchHistory(); },
          onerror: (e) => console.error(e)
        }
      });
      sessionRef.current = session;
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Exame Oral AI</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Sua voz, sua tese, seu futuro.</p>
        </div>
        <div className="bg-usp-gold/10 px-6 py-3 rounded-2xl border border-usp-gold/30 flex items-center gap-3">
          <GraduationCap className="text-usp-gold" />
          <span className="text-[10px] font-black uppercase text-usp-gold tracking-widest">Academia SanFran</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2"><Scale size={14} /> Configurações</h3>
            <div className="space-y-4">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Cadeira de Exame</label>
              <select disabled={isActive} value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-sanfran-rubi/20 rounded-2xl font-bold outline-none">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mt-6 flex gap-3">
                <Info size={16} className="text-emerald-500 flex-shrink-0" />
                <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase leading-tight">O sistema salvará sua nota automaticamente ao final do exame.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden">
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Histórico de Bancas</h4>
             <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {history.map(exam => (
                  <div key={exam.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-usp-gold transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{exam.subject_name}</span>
                      <span className={`text-[11px] font-black px-2 py-1 rounded-lg ${Number(exam.grade) >= 7 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-sanfran-rubi'}`}>NOTA {exam.grade}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1 line-clamp-2">"{exam.feedback}"</p>
                  </div>
                ))}
                {history.length === 0 && <p className="text-[9px] text-slate-400 font-black uppercase text-center py-6">Nenhum registro protocolado.</p>}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Gavel size={180} /></div>
            {!isActive ? (
              <div className="space-y-8 relative z-10">
                <div className="w-40 h-40 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border-4 border-slate-100 dark:border-white/10 shadow-inner">
                  <Mic className="w-16 h-16 text-slate-300" />
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Convocar a Banca</h4>
                  <p className="text-slate-500 font-bold max-w-xs mx-auto mt-2 italic">Doutor, sua arguição oral está prestes a começar.</p>
                </div>
                <button onClick={startSession} disabled={status === 'connecting'} className="px-12 py-6 bg-sanfran-rubi text-white rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-sanfran-rubiDark transition-all active:scale-95 disabled:opacity-50">
                  {status === 'connecting' ? 'Invocando...' : 'Iniciar Audiência'}
                </button>
              </div>
            ) : (
              <div className="space-y-10 relative z-10 w-full animate-in zoom-in duration-500">
                <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
                    <div className="absolute inset-0 bg-sanfran-rubi/20 rounded-full animate-ping opacity-25" />
                    <div className="w-40 h-40 bg-sanfran-rubi/10 rounded-full flex items-center justify-center border-4 border-sanfran-rubi/40">
                      <Volume2 className="w-16 h-16 text-sanfran-rubi" />
                    </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-black text-sanfran-rubi uppercase tracking-widest">Arguição em Curso</h4>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">Mantenha o decoro acadêmico.</p>
                </div>
                <button onClick={() => { sessionRef.current?.close(); setIsActive(false); }} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Encerrar Sessão</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralExam;
