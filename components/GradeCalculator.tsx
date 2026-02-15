
import React, { useState, useEffect } from 'react';
import { Calculator, Eraser, GraduationCap, AlertCircle, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';
import { Subject } from '../types';

interface GradeCalculatorProps {
  subjects: Subject[];
}

interface GradeData {
  p1: string;
  p2: string;
  sub: string; // Nota de Recuperação ou Substitutiva
}

const GradeCalculator: React.FC<GradeCalculatorProps> = ({ subjects }) => {
  const [grades, setGrades] = useState<Record<string, GradeData>>({});

  // Carregar dados salvos localmente ao iniciar
  useEffect(() => {
    const savedGrades = localStorage.getItem('sanfran_grades_sim');
    if (savedGrades) {
      setGrades(JSON.parse(savedGrades));
    }
  }, []);

  // Salvar dados sempre que mudarem
  useEffect(() => {
    localStorage.setItem('sanfran_grades_sim', JSON.stringify(grades));
  }, [grades]);

  const updateGrade = (subjectId: string, field: keyof GradeData, value: string) => {
    // Permitir apenas números e um ponto decimal
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    // Limitar a 10
    if (parseFloat(value) > 10) return;

    setGrades(prev => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { p1: '', p2: '', sub: '' }),
        [field]: value
      }
    }));
  };

  const clearAll = () => {
    if (confirm('Deseja limpar todas as simulações?')) {
      setGrades({});
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
            <Calculator className="w-4 h-4 text-sanfran-rubi" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Ferramenta Acadêmica</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Simulador de Médias</h2>
          <p className="text-slate-500 font-bold italic text-lg mt-2">Cálculo estratégico para aprovação (Média 5.0).</p>
        </div>
        <button 
          onClick={clearAll}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <Eraser className="w-4 h-4" /> Limpar Planilha
        </button>
      </header>

      {subjects.length === 0 ? (
        <div className="py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem] flex flex-col items-center gap-6">
          <GraduationCap className="w-16 h-16 text-slate-200 dark:text-white/5" />
          <div className="space-y-1">
            <p className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase">Sem Cadeiras Cadastradas</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adicione disciplinas no menu "Cadeiras" para simular notas.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* Cabeçalho da Planilha (Visível apenas em telas maiores) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-slate-100 dark:bg-sanfran-rubiDark/40 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <div className="col-span-4">Disciplina</div>
            <div className="col-span-2 text-center">Prova 1 (P1)</div>
            <div className="col-span-2 text-center">Prova 2 (P2)</div>
            <div className="col-span-2 text-center">Média Final</div>
            <div className="col-span-2 text-center">Status</div>
          </div>

          {subjects.map(subject => {
            const subjectGrades = grades[subject.id] || { p1: '', p2: '', sub: '' };
            const p1 = parseFloat(subjectGrades.p1);
            const p2 = parseFloat(subjectGrades.p2);
            const sub = parseFloat(subjectGrades.sub);
            
            // Lógica de Média USP (Simplificada)
            // Média = (P1 + P2) / 2
            let average = NaN;
            let status: 'aprovado' | 'reprovado' | 'rec' | 'calculando' = 'calculando';
            let message = '';
            let p2Needed = NaN;
            let recNeeded = NaN;

            if (!isNaN(p1) && !isNaN(p2)) {
              average = (p1 + p2) / 2;
              
              if (average >= 5) {
                status = 'aprovado';
                message = 'Aprovado Direto';
              } else if (average >= 3) {
                status = 'rec';
                message = 'Recuperação Necessária';
                // Cálculo da REC: (Média + REC) / 2 >= 5  =>  REC >= 10 - Média
                recNeeded = 10 - average;
              } else {
                status = 'reprovado';
                message = 'Reprovado Direto';
              }
            } else if (!isNaN(p1) && isNaN(p2)) {
               // Cálculo do quanto precisa na P2
               // (P1 + P2) / 2 >= 5 => P2 >= 10 - P1
               p2Needed = 10 - p1;
               if (p2Needed > 10) {
                 message = 'Recuperação inevitável';
                 status = 'reprovado'; // Tecnicamente vai pra Rec, mas P2 > 10 é impossível
               } else if (p2Needed < 0) {
                 message = 'Aprovado (P2 livre)'; // Já passou com a P1 (ex: P1=10, precisa 0)
                 status = 'aprovado';
               } else {
                 message = `Precisa de ${p2Needed.toFixed(1)} na P2`;
               }
            }

            // Se tiver nota de SUB/REC inserida e estava de REC
            let finalAverage = average;
            if (status === 'rec' && !isNaN(sub)) {
               finalAverage = (average + sub) / 2;
               if (finalAverage >= 5) {
                 status = 'aprovado';
                 message = 'Aprovado via REC';
               } else {
                 status = 'reprovado';
                 message = 'Reprovado pós-REC';
               }
            }

            // Cores dinâmicas baseadas no status
            const cardBg = status === 'aprovado' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' 
                         : status === 'reprovado' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                         : status === 'rec' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                         : 'bg-white dark:bg-sanfran-rubiDark/30 border-slate-200 dark:border-sanfran-rubi/30';

            const textColor = status === 'aprovado' ? 'text-emerald-700 dark:text-emerald-400'
                            : status === 'reprovado' ? 'text-red-700 dark:text-red-400'
                            : status === 'rec' ? 'text-orange-700 dark:text-orange-400'
                            : 'text-slate-900 dark:text-white';

            return (
              <div key={subject.id} className={`p-6 rounded-3xl border-2 transition-all duration-500 shadow-lg ${cardBg}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Nome da Disciplina */}
                  <div className="md:col-span-4 flex items-center gap-4">
                    <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: subject.color }}></div>
                    <div>
                      <h4 className={`text-lg font-black uppercase tracking-tight leading-none ${textColor}`}>{subject.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">SanFran • Graduação</p>
                    </div>
                  </div>

                  {/* Inputs P1 e P2 */}
                  <div className="md:col-span-2 text-center">
                    <label className="md:hidden text-[9px] font-black uppercase text-slate-400 block mb-1">P1</label>
                    <input 
                      type="number" 
                      placeholder="-" 
                      value={subjectGrades.p1}
                      onChange={(e) => updateGrade(subject.id, 'p1', e.target.value)}
                      className={`w-full md:w-20 p-3 text-center rounded-xl font-black text-lg outline-none border-2 focus:ring-2 focus:ring-offset-1 transition-all ${status === 'aprovado' ? 'bg-white/50 border-emerald-200 focus:border-emerald-500' : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 focus:border-sanfran-rubi'}`}
                    />
                  </div>

                  <div className="md:col-span-2 text-center relative">
                    <label className="md:hidden text-[9px] font-black uppercase text-slate-400 block mb-1">P2</label>
                    <input 
                      type="number" 
                      placeholder="-" 
                      value={subjectGrades.p2}
                      onChange={(e) => updateGrade(subject.id, 'p2', e.target.value)}
                      className={`w-full md:w-20 p-3 text-center rounded-xl font-black text-lg outline-none border-2 focus:ring-2 focus:ring-offset-1 transition-all ${status === 'aprovado' ? 'bg-white/50 border-emerald-200 focus:border-emerald-500' : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 focus:border-sanfran-rubi'}`}
                    />
                    {!isNaN(p2Needed) && isNaN(p2) && (
                      <div className="absolute -bottom-6 left-0 right-0 text-center animate-in slide-in-from-top-2">
                        <span className="text-[9px] font-black uppercase text-sanfran-rubi bg-red-100 px-2 py-0.5 rounded-full">Meta: {p2Needed.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Resultados */}
                  <div className="md:col-span-2 text-center">
                    <label className="md:hidden text-[9px] font-black uppercase text-slate-400 block mb-1">Média</label>
                    <div className="flex flex-col items-center">
                      <span className={`text-3xl font-black tabular-nums ${textColor}`}>
                        {isNaN(finalAverage) ? '--' : finalAverage.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 text-center flex flex-col items-center justify-center">
                     {status === 'aprovado' && <div className="flex flex-col items-center"><CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" /><span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">{message}</span></div>}
                     {status === 'reprovado' && <div className="flex flex-col items-center"><AlertCircle className="w-6 h-6 text-red-500 mb-1" /><span className="text-[9px] font-black uppercase text-red-600 tracking-widest">{message}</span></div>}
                     {status === 'rec' && <div className="flex flex-col items-center"><TrendingUp className="w-6 h-6 text-orange-500 mb-1" /><span className="text-[9px] font-black uppercase text-orange-600 tracking-widest">{message}</span></div>}
                     {status === 'calculando' && !isNaN(p1) && <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{message || 'Aguardando P2'}</span>}
                  </div>
                </div>

                {/* Área de Recuperação Expandível */}
                {status === 'rec' && (
                  <div className="mt-6 pt-6 border-t border-orange-200 dark:border-orange-800/30 animate-in slide-in-from-top-4 flex flex-col md:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-3 text-orange-700 dark:text-orange-400">
                        <HelpCircle className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase">Você está em Recuperação. Nota necessária:</span>
                        <span className="text-xl font-black bg-white/50 px-3 py-1 rounded-lg border border-orange-200">{recNeeded.toFixed(1)}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Insira Nota REC:</label>
                        <input 
                          type="number" 
                          placeholder="REC"
                          value={subjectGrades.sub}
                          onChange={(e) => updateGrade(subject.id, 'sub', e.target.value)}
                          className="w-20 p-2 text-center bg-white dark:bg-black/20 border-2 border-orange-300 rounded-lg font-black text-orange-700 outline-none focus:border-orange-500"
                        />
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradeCalculator;
