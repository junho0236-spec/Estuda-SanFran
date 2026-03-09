
import React, { useState } from 'react';
import { 
  Scale, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  TrendingUp, 
  Loader2,
  X,
  ShieldAlert,
  FileText,
  Sparkles
} from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Markdown from 'react-markdown';

interface CaseAnalyzerProps {
  onBack: () => void;
}

const CaseAnalyzer: React.FC<CaseAnalyzerProps> = ({ onBack }) => {
  const [caseDescription, setCaseDescription] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!caseDescription.trim() || isLoading) return;

    setIsLoading(true);
    setAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Analise o seguinte caso jurídico concreto:
      
      "${caseDescription}"
      
      Sua análise deve conter:
      1. **Pontos Jurídicos Relevantes**: Identifique os principais fatos e controvérsias.
      2. **Fundamentos Legais Sugeridos**: Cite artigos da Constituição, Códigos ou Leis relevantes.
      3. **Probabilidade de Procedência**: Estime uma probabilidade (ex: Baixa, Média, Alta) com base em tendências jurisprudenciais gerais.
      4. **Precedentes Relevantes**: Mencione súmulas ou teses de tribunais superiores (STF/STJ) que possam se aplicar.
      
      **IMPORTANTE**: Adicione um disclaimer claro no final informando que esta é uma análise gerada por IA para fins acadêmicos e não substitui a consulta a um advogado ou a análise de um juiz real.
      
      Formate a resposta em Markdown claro e estruturado.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: "Você é um Analista Jurídico Sênior especializado em Direito Brasileiro. Sua função é auxiliar estudantes a identificar teses e fundamentos em casos práticos."
        }
      });

      setAnalysis(response.text || "Não foi possível gerar a análise.");
    } catch (error) {
      console.error("Analysis Error:", error);
      setAnalysis("Erro ao processar a análise. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-white dark:bg-[#0d0303] w-full rounded-[3rem] border-4 border-sanfran-rubi shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="p-6 md:p-8 border-b border-slate-100 dark:border-sanfran-rubi/20 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all mr-2"
              title="Voltar"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="bg-sanfran-rubi p-3 rounded-2xl shadow-lg shadow-red-900/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Analisador de Casos IA</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inteligência Jurisprudencial</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {!analysis && !isLoading && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800 flex gap-4">
                <ShieldAlert className="text-blue-600 shrink-0" size={24} />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 leading-relaxed">
                  Insira os detalhes de um caso concreto ou hipotético abaixo. A IA irá processar os fatos e sugerir caminhos jurídicos baseados na legislação brasileira.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Descrição do Caso</label>
                <textarea 
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  placeholder="Descreva os fatos, as partes envolvidas e o conflito central..."
                  className="w-full h-64 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-[2rem] font-serif text-lg text-slate-800 dark:text-slate-200 outline-none focus:border-sanfran-rubi resize-none shadow-inner"
                />
              </div>

              <button 
                onClick={handleAnalyze}
                disabled={!caseDescription.trim() || isLoading}
                className="w-full py-5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-red-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Sparkles size={20} /> Iniciar Análise Jurídica
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-sanfran-rubi blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-sanfran-rubi animate-spin relative z-10" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Processando Precedentes</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Consultando STF, STJ e Doutrina...</p>
              </div>
            </div>
          )}

          {analysis && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-sanfran-rubi" size={24} />
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Parecer da IA</h3>
                </div>
                <button 
                  onClick={() => setAnalysis(null)}
                  className="text-[10px] font-black uppercase text-sanfran-rubi tracking-widest hover:underline"
                >
                  Nova Análise
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-inner">
                <div className="markdown-body prose dark:prose-invert prose-slate max-w-none">
                  <Markdown>{analysis}</Markdown>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-800 flex gap-4">
                <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 leading-relaxed uppercase tracking-wide">
                  Atenção: Esta análise é meramente informativa e acadêmica. Não constitui aconselhamento jurídico profissional.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-sanfran-rubi/20 flex justify-center">
           <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp size={14} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">SanFran AI • Módulo de Análise Processual</span>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default CaseAnalyzer;
