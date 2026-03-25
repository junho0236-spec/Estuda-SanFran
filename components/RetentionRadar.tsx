import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Brain, TrendingUp, AlertCircle, ShieldCheck } from 'lucide-react';

interface RetentionRadarProps {
  data: {
    subject: string;
    retention: number;
  }[];
}

const RetentionRadar: React.FC<RetentionRadarProps> = ({ data }) => {
  const insight = useMemo(() => {
    if (data.length === 0) return null;
    const avg = data.reduce((acc, d) => acc + d.retention, 0) / data.length;
    
    if (avg > 80) return { type: 'high', text: 'Retenção excelente! Você está dominando o conteúdo.' };
    if (avg > 50) return { type: 'medium', text: 'Boa retenção. Continue revisando para consolidar.' };
    return { type: 'low', text: 'Atenção: Retenção baixa. Aumente a frequência de revisões.' };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <Brain className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Sem dados de retenção</h3>
        <p className="text-xs font-bold text-slate-500 mt-2">Comece a revisar seus flashcards para gerar insights.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-6 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div>
          <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-emerald-500 w-6 h-6" /> Retenção Estimada
          </h3>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">
            Domínio por Matéria (%)
          </p>
        </div>
      </div>

      <div className="flex-1 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="60%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fontSize: 9, fill: '#64748b', fontWeight: 900 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={false} 
              axisLine={false} 
            />
            <Radar
              name="Retenção"
              dataKey="retention"
              stroke="#10b981"
              strokeWidth={3}
              fill="#10b981"
              fillOpacity={0.4}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value}%`, 'Retenção']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {insight && (
        <div className={`mt-2 p-4 rounded-2xl border flex items-start gap-3 ${
          insight.type === 'high' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
          insight.type === 'medium' ? 'bg-blue-50 border-blue-200 text-blue-800' : 
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {insight.type === 'high' && <TrendingUp className="w-5 h-5 shrink-0" />}
          {insight.type === 'medium' && <TrendingUp className="w-5 h-5 shrink-0 opacity-50" />}
          {insight.type === 'low' && <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-xs font-bold leading-relaxed">{insight.text}</p>
        </div>
      )}
    </div>
  );
};

export default RetentionRadar;
