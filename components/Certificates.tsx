import React, { useState, useRef } from 'react';
import { Award, Download, Share2, CheckCircle2, Lock, ArrowLeft, ShieldCheck, Star, Trophy } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface CertificatesProps {
  userId: string;
  userName?: string;
}

interface Certificate {
  id: string;
  title: string;
  description: string;
  date: string;
  unlocked: boolean;
  type: 'course' | 'achievement' | 'milestone';
  icon: React.ReactNode;
}

const Certificates: React.FC<CertificatesProps> = ({ userId, userName = 'Estudante' }) => {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  // Mock data for certificates based on user progress
  const certificates: Certificate[] = [
    {
      id: 'cert-1',
      title: 'Mestre da Lei Seca',
      description: 'Concedido por ler mais de 500 artigos no Vade Mecum Digital.',
      date: new Date().toLocaleDateString('pt-BR'),
      unlocked: true,
      type: 'achievement',
      icon: <ShieldCheck className="w-8 h-8 text-amber-500" />
    },
    {
      id: 'cert-2',
      title: 'Especialista em Direito Civil',
      description: 'Conclusão com excelência do módulo avançado de Direito Civil.',
      date: new Date().toLocaleDateString('pt-BR'),
      unlocked: true,
      type: 'course',
      icon: <Award className="w-8 h-8 text-blue-500" />
    },
    {
      id: 'cert-3',
      title: 'Orador Implacável',
      description: 'Atingiu a nota máxima em 10 simulações de Sustentação Oral.',
      date: '-',
      unlocked: false,
      type: 'milestone',
      icon: <Trophy className="w-8 h-8 text-slate-400" />
    },
    {
      id: 'cert-4',
      title: 'Guardião da Jurisprudência',
      description: 'Analisou e fichou mais de 50 casos complexos com IA.',
      date: '-',
      unlocked: false,
      type: 'achievement',
      icon: <Star className="w-8 h-8 text-slate-400" />
    }
  ];

  const handleDownload = () => {
    // In a real app, we would use html2canvas or a PDF library here
    alert("Iniciando download do certificado em PDF...");
  };

  const handleShare = () => {
    alert("Link do certificado copiado para a área de transferência!");
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-4 md:px-0 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800/30 mb-4">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Conquistas & Reconhecimento</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Meus Certificados</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Valide seu esforço e compartilhe suas vitórias.</p>
        </div>
      </header>

      {selectedCert ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setSelectedCert(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold uppercase tracking-widest text-xs transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para Galeria
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Certificate Preview */}
            <div className="lg:col-span-2">
              <div 
                ref={certRef}
                className="w-full aspect-[1.414/1] bg-white border-[12px] border-slate-100 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-12 text-center"
                style={{
                  backgroundImage: `url('https://www.transparenttextures.com/patterns/cream-paper.png')`,
                  backgroundColor: '#fdfbf7'
                }}
              >
                {/* Decorative Borders */}
                <div className="absolute inset-4 border-2 border-amber-200/50 pointer-events-none"></div>
                <div className="absolute inset-5 border border-amber-200/30 pointer-events-none"></div>
                
                {/* SanFran Logo / Seal Placeholder */}
                <div className="w-24 h-24 rounded-full border-4 border-amber-100 flex items-center justify-center mb-8 bg-white shadow-inner">
                  <ShieldCheck className="w-12 h-12 text-amber-600" />
                </div>

                <h4 className="text-amber-800 font-serif text-xl tracking-[0.3em] uppercase mb-2">SanFran Academy</h4>
                <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-8 font-serif">Certificado de Conclusão</h1>
                
                <p className="text-slate-600 font-medium text-lg mb-4">Certificamos que</p>
                <p className="text-4xl font-black text-slate-900 border-b-2 border-slate-200 pb-2 mb-8 px-12 font-serif italic">{userName}</p>
                
                <p className="text-slate-600 font-medium text-lg mb-2">concluiu com êxito os requisitos para o título de</p>
                <p className="text-2xl font-black text-amber-700 uppercase tracking-widest mb-12">{selectedCert.title}</p>

                <div className="flex justify-between w-full max-w-md mt-auto pt-8 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-slate-900 font-bold">{selectedCert.date}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Data de Emissão</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-900 font-bold font-mono text-sm">{selectedCert.id.toUpperCase()}-{Math.floor(Math.random() * 10000)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Código de Autenticidade</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions & Details */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Detalhes da Conquista</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{selectedCert.description}</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleDownload}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Baixar PDF
                  </button>
                  <button 
                    onClick={handleShare}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} /> Compartilhar Link
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-amber-900 dark:text-amber-500 uppercase text-xs tracking-widest mb-1">Certificado Verificado</h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 font-medium">Este certificado possui um código único e pode ser verificado publicamente por recrutadores ou instituições.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div 
              key={cert.id}
              onClick={() => cert.unlocked ? setSelectedCert(cert) : null}
              className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col h-full ${
                cert.unlocked 
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl hover:border-amber-400 hover:shadow-amber-500/10 cursor-pointer group' 
                  : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 opacity-70 cursor-not-allowed'
              }`}
            >
              {!cert.unlocked && (
                <div className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full">
                  <Lock size={16} className="text-slate-400" />
                </div>
              )}
              
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                cert.unlocked ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-200 dark:bg-slate-800'
              }`}>
                {cert.icon}
              </div>

              <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${
                cert.unlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500'
              }`}>
                {cert.title}
              </h3>
              
              <p className={`text-sm flex-grow ${
                cert.unlocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'
              }`}>
                {cert.description}
              </p>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  cert.unlocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                }`}>
                  {cert.type === 'course' ? 'Módulo' : cert.type === 'achievement' ? 'Conquista' : 'Marco'}
                </span>
                {cert.unlocked && (
                  <span className="text-[10px] font-bold text-slate-400">{cert.date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certificates;
