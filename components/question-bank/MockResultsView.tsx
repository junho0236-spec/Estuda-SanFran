import React from 'react';
import {
  Trophy,
  AlertTriangle,
  BookOpen,
  BarChart3,
  BrainCircuit,
  Download,
  Bookmark,
  HelpCircle,
} from 'lucide-react';
import {
  buildMockReportCsv,
  buildMockReportText,
  downloadMockReport,
} from './exportMockReport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { Question } from '../../types';
import type { QuestionBankMockResults } from './types';

export interface MockResultsViewProps {
  mockResults: QuestionBankMockResults;
  mockQuestions: Question[];
  mockAnswers: Record<string, number>;
  sessionConfidenceStats: Record<string, 'certeza' | 'duvida' | 'chute'>;
  onExitMock: () => void;
  onReviewErrors: () => void;
  onCreateFlashcardFromError: (q: Question, userAnswer: number | undefined, wasCorrect: boolean) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export const MockResultsView: React.FC<MockResultsViewProps> = ({
  mockResults,
  mockQuestions,
  mockAnswers,
  sessionConfidenceStats,
  onExitMock,
  onReviewErrors,
  onCreateFlashcardFromError,
  showNotification,
}) => {
  const scorePct = mockResults.total > 0 ? Math.round((mockResults.score / mockResults.total) * 100) : 0;
  const statusApproved = mockResults.total > 0 && mockResults.score / mockResults.total >= 0.7;

  const exportBase = `simulado-${new Date().toISOString().slice(0, 10)}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                <Trophy className="text-emerald-600 dark:text-emerald-400" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Resultado do Simulado</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Desempenho Geral e Análise por Disciplina</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const text = buildMockReportText(
                  mockQuestions,
                  mockAnswers,
                  mockResults,
                  sessionConfidenceStats
                );
                downloadMockReport(text, exportBase, 'txt');
                showNotification('Relatório .txt baixado.', 'success');
              }}
              className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Download size={16} /> Exportar .txt
            </button>
            <button
              type="button"
              onClick={() => {
                const csv = buildMockReportCsv(
                  mockQuestions,
                  mockAnswers,
                  mockResults,
                  sessionConfidenceStats
                );
                downloadMockReport(csv, exportBase, 'csv');
                showNotification('Relatório .csv baixado.', 'success');
              }}
              className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Download size={16} /> Exportar .csv
            </button>
            <button
              type="button"
              onClick={onExitMock}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Sair do Simulado
            </button>
            <button
              type="button"
              onClick={onReviewErrors}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20"
            >
              Revisar Erros
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Certeza', value: mockResults.confidenceStats.certeza },
                      { name: 'Dúvida', value: mockResults.confidenceStats.duvida },
                      { name: 'Chute', value: mockResults.confidenceStats.chute },
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {scorePct}%
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verdadeiro Domínio</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6 w-full">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Acertos</span>
                <span className="text-2xl font-black text-emerald-600">
                  {mockResults.score} / {mockResults.total}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Certeza Total</span>
                <span className="text-2xl font-black text-emerald-500">{mockResults.confidenceStats.certeza}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dúvidas (Acertos)</span>
                <span className="text-2xl font-black text-amber-500">{mockResults.doubtGuesses.length}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chutes (Sorte)</span>
                <span className="text-2xl font-black text-red-500">{mockResults.luckyGuesses.length}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
                <span
                  className={`text-2xl font-black ${
                    statusApproved ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {statusApproved ? 'Aprovado' : 'Em Evolução'}
                </span>
              </div>
            </div>
            {mockResults.luckyGuesses.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-sm flex items-center gap-3">
                <AlertTriangle size={20} />
                Revisar fundamento ({mockResults.luckyGuesses.length} acertos por sorte)
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <BrainCircuit size={40} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Análise Metacognitiva</h3>
            {mockResults.luckyGuesses.length > 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest mb-2">
                  <AlertTriangle size={14} /> Alerta de Revisão
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Priorize revisar os temas em que você acertou por dúvida ou chute.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 leading-relaxed">
                Seu nível de certeza está alinhado com seus acertos. Continue focando nos temas de dúvida!
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <BarChart3 className="text-blue-500" /> Desempenho por Disciplina
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockResults.subjectStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="subject" type="category" width={150} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { subject: string; correct: number; total: number };
                      const percent = Math.round((data.correct / data.total) * 100);
                      return (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800">
                          <p className="font-black text-xs uppercase tracking-widest mb-1">{data.subject}</p>
                          <p className="text-2xl font-black text-blue-400">{percent}%</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {data.correct} de {data.total} questões
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey={(d: { correct: number; total: number }) => (d.correct / d.total) * 100} radius={[0, 10, 10, 0]} barSize={32}>
                  {mockResults.subjectStats.map((entry, index) => {
                    const percent = (entry.correct / entry.total) * 100;
                    let color = '#ef4444';
                    if (percent >= 80) color = '#10b981';
                    else if (percent >= 60) color = '#f59e0b';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {(mockResults.reviewLaterIds.length > 0 || mockResults.unansweredIds.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockResults.reviewLaterIds.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                  <Bookmark className="text-amber-500" /> Revisar depois ({mockResults.reviewLaterIds.length})
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {mockResults.reviewLaterIds.map((id) => {
                    const q = mockQuestions.find((x) => x.id === id);
                    if (!q) return null;
                    const preview = (q.statement || '').replace(/\s+/g, ' ').trim().slice(0, 80);
                    return (
                      <li key={id} className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 border border-amber-100 dark:border-amber-900/40">
                        <span className="font-bold text-amber-900 dark:text-amber-200">{q.subject}</span>
                        {preview ? ` — ${preview}${(q.statement || '').length > 80 ? '…' : ''}` : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {mockResults.unansweredIds.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                  <HelpCircle className="text-slate-400" /> Não respondidas ({mockResults.unansweredIds.length})
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {mockResults.unansweredIds.map((id) => {
                    const q = mockQuestions.find((x) => x.id === id);
                    if (!q) return null;
                    const preview = (q.statement || '').replace(/\s+/g, ' ').trim().slice(0, 80);
                    return (
                      <li key={id} className="rounded-xl bg-slate-50 dark:bg-slate-800/80 px-3 py-2 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{q.subject}</span>
                        {preview ? ` — ${preview}${(q.statement || '').length > 80 ? '…' : ''}` : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {(mockResults.luckyGuesses.length > 0 || mockResults.doubtGuesses.length > 0) && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
              <BookOpen className="text-amber-500" /> Questões para Revisão
            </h3>
            <div className="space-y-4">
              {[...new Set([...mockResults.luckyGuesses, ...mockResults.doubtGuesses])].map(qId => {
                const q = mockQuestions.find(q => q.id === qId);
                if (!q) return null;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
                  >
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70%]">
                      {(q.statement || '').replace(/\s+/g, ' ').trim().slice(0, 50)}
                      {(q.statement || '').length > 50 ? '…' : ''}
                    </span>
                    <button
                      onClick={() => {
                        onCreateFlashcardFromError(q, mockAnswers[q.id], mockAnswers[q.id] === q.correct_answer);
                        showNotification('Flashcard criado!', 'success');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                      Flashcard
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
