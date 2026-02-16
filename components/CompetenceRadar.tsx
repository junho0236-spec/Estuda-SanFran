import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Subject, StudySession } from '../types';
import { BrainCircuit, AlertTriangle, TrendingUp, Info } from 'lucide-react';

interface CompetenceRadarProps {
  subjects: Subject[];
  studySessions: StudySession[];
}

const CompetenceRadar: React.FC<CompetenceRadarProps> = ({ subjects, studySessions }) => {
  // Processamento de dados
  const data = useMemo(() => {
    if (subjects.length === 0) return [];

    // 1. Calcular horas totais por matéria
    const hoursBySubject: Record<string, number> = {};
    
    // Inicializar com 0
    subjects.forEach(s => hoursBySubject[s.id] = 0);

    // Somar sessões
    studySessions.forEach(session => {
      if (session.subject_id && hoursBySubject[session.subject_id] !== undefined) {
        hoursBySubject[session.subject_id] += Number(session.duration) || 0;
      }
    });

    // 2. Formatar para o Recharts e converter segundos em horas
    let chartData = subjects.map(s => ({
      subject: s.name,
      id: s.id,
      hours: parseFloat((hoursBySubject[s.id] / 3600).toFixed(1)),
      fullMark: 0 // Será calculado depois
    }));

    // 3. Filtrar e limitar (Radar charts ficam ruins com muitos eixos)
    // Ordenar por horas para pegar as disciplinas mais relevantes se houver muitas
    chartData.sort((a, b) => b.hours - a.hours);
    
    // Limitar a 6 eixos para legibilidade
    const topData = chartData.slice(0, 6);

    // Encontrar o valor máximo para ajustar a escala
    const maxVal = Math.max(...topData.map(d => d.hours));
    const domainMax = maxVal === 0 ? 10 : Math.ceil(maxVal * 1.2); // Margem de 20%

    return topData.map(d => ({ ...d, fullMark: domainMax }));
  }, [subjects, studySessions]);

  // Insight Automático
  const insight = useMemo(() => {
    if (data.length < 2) return { type: 'neutral', text: "Adicione mais disciplinas para análise." };
    
    const activeData = data.filter(d => d.hours > 0);
    if (activeData.length === 0) return { type: 'neutral', text: "Inicie o cronômetro para gerar seu perfil." };
    
    // Re-ordenar pelos ativos para comparar o maior com o menor (que tenha dados)
    activeData.sort((a, b) => b.hours - a.hours);
    
    const mostStudied = activeData[0];
    const leastStudied = activeData[activeData.length - 1];

    if (activeData.length === 1) return { type: 'neutral', text: `Foco exclusivo em ${mostStudied.subject}. Diversifique!` };

    const ratio = leastStudied.hours === 0 ? Infinity : mostStudied.hours / leastStudied.hours;

    if (ratio > 3) {
      return { 
        type: 'unbalanced', 
        text: `Atenção: Desequilíbrio. ${mostStudied.subject} tem 3x mais horas que ${leastStudied.subject}.` 
      };
    }
    return { type: 'balanced', text: "Seu ciclo de estudos está bem distribuído." };
  }, [data]);

  if (subjects.length === 0) return null;

  return (
    <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-6 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div>
          <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-usp-blue w-6 h-6" /> Radar de Competências
          </h3>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Equilíbrio de Carga Horária</p>
        </div>
      </div>

      <div className="flex-1 w-full relative z-10 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} />
            {/* Removed complex tick object to prevent React Error #31 in some environments */}
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 'auto']} 
              tick={false} 
              axisLine={false} 
            />
            <Radar
              name="Horas Estudadas"
              dataKey="hours"
              stroke="#9B111E"
              strokeWidth={3}
              fill="#9B111E"
              fillOpacity={0.4}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              itemStyle={{ color: '#9B111E', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value}h`, 'Tempo']}
              labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {insight && (
        <div className={`mt-2 p-4 rounded-2xl border flex items-start gap-3 ${insight.type === 'unbalanced' ? 'bg-orange-50 border-orange-200 text-orange-800' : insight.type === 'balanced' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}>
           {insight.type === 'unbalanced' && <AlertTriangle className="w-5 h-5 shrink-0" />}
           {insight.type === 'balanced' && <TrendingUp className="w-5 h-5 shrink-0" />}
           {insight.type === 'neutral' && <Info className="w-5 h-5 shrink-0" />}
           <div>
              <p className="text-xs font-bold leading-relaxed">{insight.text}</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default CompetenceRadar;