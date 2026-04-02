import type { Question } from '../../types';
import type { QuestionBankMockResults } from './types';

function optionLetter(idx: number): string {
  if (idx < 0 || idx > 25) return String(idx);
  return String.fromCharCode(65 + idx);
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildMockReportText(
  mockQuestions: Question[],
  mockAnswers: Record<string, number>,
  mockResults: QuestionBankMockResults,
  confidenceByQuestion: Record<string, 'certeza' | 'duvida' | 'chute'>
): string {
  const lines: string[] = [];
  const pct = mockResults.total > 0 ? Math.round((mockResults.score / mockResults.total) * 100) : 0;
  lines.push('RELATÓRIO DO SIMULADO — SanFran Academy');
  lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  if (mockResults.startedAtIso) lines.push(`Início do simulado: ${mockResults.startedAtIso}`);
  lines.push(`Tempo: ${Math.floor(mockResults.timeSpent / 60)}min ${mockResults.timeSpent % 60}s`);
  lines.push(`Acertos: ${mockResults.score} / ${mockResults.total} (${pct}%)`);
  lines.push(`Não respondidas: ${mockResults.unansweredIds.length}`);
  lines.push(`Marcadas "revisar depois": ${mockResults.reviewLaterIds.length}`);
  lines.push('');
  lines.push('--- Detalhe por questão ---');
  mockQuestions.forEach((q, i) => {
    const ua = mockAnswers[q.id];
    const status =
      ua === undefined ? 'EM BRANCO' : ua === q.correct_answer ? 'ACERTO' : 'ERRO';
    const conf = confidenceByQuestion[q.id] || '—';
    const review = mockResults.reviewLaterIds.includes(q.id) ? 'sim' : 'não';
    const userStr = ua === undefined ? '—' : optionLetter(ua);
    const keyStr = optionLetter(q.correct_answer);
    const stmt = q.statement.replace(/\s+/g, ' ').trim().slice(0, 200);
    lines.push(
      `${i + 1}. [${status}] ${q.subject}${q.topic ? ` / ${q.topic}` : ''} | Resposta: ${userStr} | Gabarito: ${keyStr} | Confiança: ${conf} | Revisar depois: ${review}`
    );
    lines.push(`   ${stmt}${q.statement.length > 200 ? '…' : ''}`);
    lines.push('');
  });
  return lines.join('\n');
}

export function buildMockReportCsv(
  mockQuestions: Question[],
  mockAnswers: Record<string, number>,
  mockResults: QuestionBankMockResults,
  confidenceByQuestion: Record<string, 'certeza' | 'duvida' | 'chute'>
): string {
  const header = [
    'n',
    'disciplina',
    'topico',
    'status',
    'resposta_usuario',
    'gabarito',
    'confianca',
    'revisar_depois',
    'enunciado_curto',
  ];
  const rows = mockQuestions.map((q, i) => {
    const ua = mockAnswers[q.id];
    const status =
      ua === undefined ? 'em_branco' : ua === q.correct_answer ? 'acerto' : 'erro';
    const stmt = q.statement.replace(/\s+/g, ' ').trim().slice(0, 500);
    return [
      String(i + 1),
      q.subject,
      q.topic || '',
      status,
      ua === undefined ? '' : optionLetter(ua),
      optionLetter(q.correct_answer),
      confidenceByQuestion[q.id] || '',
      mockResults.reviewLaterIds.includes(q.id) ? 'sim' : 'não',
      stmt,
    ].map((c) => escapeCsvCell(c));
  });
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function downloadMockReport(
  content: string,
  filenameBase: string,
  ext: 'txt' | 'csv'
): void {
  const blob = new Blob([content], { type: ext === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
