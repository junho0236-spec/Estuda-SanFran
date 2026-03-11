import { View } from './types';

export const getViewLabel = (view: string) => {
  switch (view) {
    case View.Dashboard: return 'Analisando o Painel';
    case View.Anki: return 'Revisando Flashcards';
    case View.Timer: return 'Em Sessão de Foco';
    case View.Subjects: return 'Organizando Cadeiras';
    case View.Tasks: return 'Consultando a Pauta';
    case View.Calendar: return 'Revisando a Agenda';
    case View.Ranking: return 'No Hall da Fama';
    case View.Library: return 'Consultando a Doutrina';
    case View.Largo: return 'No Largo São Francisco';
    case View.Duel: return 'Em Combate Intelectual';
    default: return 'Caminhando pelas Arcadas';
  }
};
