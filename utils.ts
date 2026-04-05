import { View } from './types';

export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
};

export const getBrasiliaISOString = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  return formatter.format(now).replace(' ', 'T');
};

export const getViewLabel = (view: string) => {
  switch (view) {
    case View.Dashboard: return 'Analisando o Painel';
    case View.Anki: return 'Revisando Flashcards';
    case View.Timer: return 'Em Sessão de Foco';
    case View.Subjects: return 'Organizando Cadeiras';
    case View.Tasks: return 'Consultando a Pauta';
    case View.Calendar: return 'Revisando a Agenda';
    case View.Ranking: return 'No Hall da Fama';
    case View.MeuDinheiroOrganizado: return 'Organizando as Finanças';
    case View.Library: return 'Consultando a Doutrina';
    case View.Largo: return 'No Largo São Francisco';
    case View.Duel: return 'Em Combate Intelectual';
    default: return 'Caminhando pelas Arcadas';
  }
};
