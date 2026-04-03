import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Loader2, Timer, Gavel } from 'lucide-react';
import { QUESTION_MODALITY_LABELS, type Folder, type QuestionModality } from '../../types';
import type { QuestionBankAiConfig, QuestionBankAiConfigSetter } from './types';
import { SearchableFilterDropdown, toOptions } from './SearchableFilterDropdown';
import { DisciplineFilterDropdown } from './DisciplineFilterDropdown';

export interface QuestionBankAIGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  aiConfig: QuestionBankAiConfig;
  setAiConfig: QuestionBankAiConfigSetter;
  folders: Folder[];
  onSubmit: (e: React.FormEvent) => void;
  isGenerating: boolean;
  generatingStatus: string;
  aiCooldown: number;
}

export const QuestionBankAIGeneratorModal: React.FC<QuestionBankAIGeneratorModalProps> = ({
  open,
  onClose,
  aiConfig,
  setAiConfig,
  folders,
  onSubmit,
  isGenerating,
  generatingStatus,
  aiCooldown,
}) => {
  if (!open) return null;

  // Portal + z alto: overlay dentro do QuestionBank ficava por baixo do HeaderActions (main).
  const overlay = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-ai-gen-title"
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="qb-ai-gen-title" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-purple-500" aria-hidden />
            Gerador com IA
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar gerador com IA">
            <X size={24} aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Disciplina (catálogo fixo) *
              </label>
              <DisciplineFilterDropdown
                emptyLabel="Selecione a disciplina"
                clearLabel="Selecione a disciplina"
                value={aiConfig.subject}
                onChange={(subject) => setAiConfig({ ...aiConfig, subject })}
                className="w-full"
                useFixedPortal
              />
              {!aiConfig.baseOnFlashcards && !aiConfig.context && !aiConfig.subject.trim() ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Escolha uma disciplina para gerar questões.
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Sugestão de tópico (opcional)
              </label>
              <input
                type="text"
                value={aiConfig.topic}
                onChange={e => setAiConfig({ ...aiConfig, topic: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: Crimes contra a vida"
                aria-describedby="qb-ai-topic-hint"
              />
              <p id="qb-ai-topic-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                A IA reutiliza os tópicos que já existem no seu acervo quando faz sentido; esta sugestão só orienta o foco.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Material de Base / Texto da Aula (Opcional)</label>
            <textarea
              value={aiConfig.context}
              onChange={e => setAiConfig({ ...aiConfig, context: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none min-h-[120px] text-sm"
              placeholder="Cole aqui o texto da aula, anotações ou trechos de livros para que a IA crie questões baseadas exatamente neste conteúdo..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Estilo de Prova</label>
              <select
                value={aiConfig.examStyle}
                onChange={e => setAiConfig({ ...aiConfig, examStyle: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <optgroup label="Exames de Ordem">
                  <option value="OAB (FGV)">OAB (FGV)</option>
                </optgroup>
                <optgroup label="Carreiras Jurídicas">
                  <option value="Magistratura Estadual">Magistratura Estadual</option>
                  <option value="Magistratura Federal">Magistratura Federal</option>
                  <option value="Ministério Público">Ministério Público</option>
                  <option value="Promotor de Justiça">Promotor de Justiça</option>
                  <option value="Procurador da República">Procurador da República</option>
                  <option value="Defensoria Pública">Defensoria Pública</option>
                  <option value="Defensor Público da União">Defensor Público da União</option>
                  <option value="Procuradorias (AGU/PGE/PGM)">Procuradorias</option>
                  <option value="Delegado de Polícia">Delegado de Polícia</option>
                  <option value="Delegado Federal">Delegado Federal</option>
                  <option value="Diplomacia (CACD)">Diplomacia (CACD)</option>
                </optgroup>
                <optgroup label="Tribunais e Outros">
                  <option value="Analista Judiciário">Analista Judiciário</option>
                  <option value="Técnico Judiciário">Técnico Judiciário</option>
                  <option value="Carreiras Policiais (Agente/Escrivão)">Carreiras Policiais</option>
                  <option value="Cartórios">Cartórios</option>
                  <option value="Acadêmico (SanFran)">Acadêmico (SanFran)</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Modalidade</label>
              <select
                value={aiConfig.modality}
                onChange={e =>
                  setAiConfig({
                    ...aiConfig,
                    modality: e.target.value as QuestionModality,
                  })
                }
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="multipla_escolha">{QUESTION_MODALITY_LABELS.multipla_escolha} (ABCDE)</option>
                <option value="certo_errado">{QUESTION_MODALITY_LABELS.certo_errado} (CESPE)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Instituição</label>
              <input
                type="text"
                value={aiConfig.institution}
                onChange={e => setAiConfig({ ...aiConfig, institution: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: USP, FGV, VUNESP"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Diploma Legal</label>
              <input
                type="text"
                value={aiConfig.legalDiploma}
                onChange={e => setAiConfig({ ...aiConfig, legalDiploma: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: CPC, CP, CF/88"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Carreira</label>
              <input
                type="text"
                value={aiConfig.career}
                onChange={(e) => setAiConfig({ ...aiConfig, career: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: Magistratura, OAB, MPU"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cargo</label>
              <input
                type="text"
                value={aiConfig.jobPosition}
                onChange={(e) => setAiConfig({ ...aiConfig, jobPosition: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: Juiz substituto, Analista judiciário"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Área de formação</label>
              <input
                type="text"
                value={aiConfig.formationArea}
                onChange={(e) => setAiConfig({ ...aiConfig, formationArea: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: Direito público"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Escolaridade</label>
              <input
                type="text"
                value={aiConfig.educationLevel}
                onChange={(e) => setAiConfig({ ...aiConfig, educationLevel: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: Superior completo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome do Exame</label>
              <input
                type="text"
                value={aiConfig.examName}
                onChange={e => setAiConfig({ ...aiConfig, examName: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Ex: XXXIX Exame OAB"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipo de Enunciado</label>
              <select
                value={aiConfig.statementType}
                onChange={e => setAiConfig({ ...aiConfig, statementType: e.target.value as QuestionBankAiConfig['statementType'] })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="Caso Prático (Situação Hipotética)">Caso Prático</option>
                <option value="Enunciado Direto">Enunciado Direto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Foco Jurídico</label>
            <div className="flex flex-wrap gap-3">
              {[
                'Lei Seca',
                'Jurisprudência Atualizada',
                'Doutrina Clássica',
                'Súmulas STF/STJ',
                'Informativos Recentes',
                'Ética Profissional',
                'Direitos Humanos',
                'Direito Comparado',
                'Teoria Geral',
                'Prática Processual',
                'Filosofia do Direito',
                'Sociologia Jurídica',
              ].map(focus => (
                <label key={focus} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiConfig.legalFocus.includes(focus)}
                    onChange={e => {
                      const newFocus = e.target.checked
                        ? [...aiConfig.legalFocus, focus]
                        : aiConfig.legalFocus.filter(f => f !== focus);
                      setAiConfig({ ...aiConfig, legalFocus: newFocus });
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{focus}</span>
                </label>
              ))}
            </div>
          </div>

          {aiConfig.legalFocus.includes('Jurisprudência Atualizada') && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm mb-2">
                <Gavel size={18} /> Configurações de Jurisprudência
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase">Tribunal</label>
                  <select
                    value={aiConfig.tribunal}
                    onChange={e => setAiConfig({ ...aiConfig, tribunal: e.target.value as QuestionBankAiConfig['tribunal'] })}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="Jurisprudência STF">STF</option>
                    <option value="Jurisprudência STJ">STJ</option>
                    <option value="Ambos">Ambos (STF/STJ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase">Ano / Período</label>
                  <select
                    value={aiConfig.yearFilter}
                    onChange={e => setAiConfig({ ...aiConfig, yearFilter: e.target.value as QuestionBankAiConfig['yearFilter'] })}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="Últimos 2 anos">Últimos 2 anos</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/30">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={aiConfig.baseOnFlashcards}
                onChange={e => setAiConfig({ ...aiConfig, baseOnFlashcards: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-bold text-purple-800 dark:text-purple-300">Basear em meus Flashcards</span>
            </label>

            {aiConfig.baseOnFlashcards && (
              <select
                value={aiConfig.selectedFolderId}
                onChange={e => setAiConfig({ ...aiConfig, selectedFolderId: e.target.value })}
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              >
                <option value="">Selecione uma pasta do Acervo</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quantidade</label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={aiConfig.count}
                onChange={e => setAiConfig({ ...aiConfig, count: parseInt(e.target.value, 10) || 1 })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dificuldade</label>
              <select
                value={aiConfig.difficulty}
                onChange={e => setAiConfig({ ...aiConfig, difficulty: e.target.value as QuestionBankAiConfig['difficulty'] })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="muito_facil">Muito Fácil</option>
                <option value="facil">Fácil</option>
                <option value="media">Média</option>
                <option value="dificil">Difícil</option>
                <option value="muito_dificil">Muito Difícil</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isGenerating || aiCooldown > 0}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Gerando...
                </>
              ) : aiCooldown > 0 ? (
                <>
                  <Timer className="w-5 h-5" /> Aguarde ({aiCooldown}s)
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Gerar Questões
                </>
              )}
            </button>
            {isGenerating && generatingStatus && <p className="text-center text-sm text-purple-300 mt-2">{generatingStatus}</p>}
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null;
};
