import { toast } from 'sonner';
import type { Subject, Task } from '../types';
import { googleCalendarService } from './googleCalendarService';
import firebaseWebConfig from '../firebase-applet-config.json';

function isAiStudioOrGenLangFirebaseProject(): boolean {
  const id = String(firebaseWebConfig.projectId ?? '');
  const domain = String(firebaseWebConfig.authDomain ?? '');
  return /gen-lang-client/i.test(id) || /gen-lang-client/i.test(domain);
}

/**
 * Login Google (Firebase) com escopo Calendar, grava token e envia tarefas com prazo ao Google Agenda.
 * Usado pela vista Agenda e pelo atalho na lista de tarefas.
 */
export async function connectGoogleCalendarAndSyncTasks(options: {
  tasks: Task[];
  subjects: Subject[];
  onAfterSync?: () => void | Promise<void>;
  /** Só CalendarView: após sync, recarregar eventos Google na grade */
  onReloadGoogleExternalEvents?: () => void | Promise<void>;
}): Promise<void> {
  const { tasks, subjects, onAfterSync, onReloadGoogleExternalEvents } = options;

  if (isAiStudioOrGenLangFirebaseProject()) {
    toast.error(
      'O Firebase configurado é um projeto de demonstração (AI Studio / gen-lang-client) que não suporta login Google no site. Cria um projeto Firebase para o SanFran, regista uma Web app, substitui firebase-applet-config.json, ativa Google em Authentication, adiciona o domínio (ex.: www.sanfranacademy.com.br) em Authorized domains e ativa a Google Calendar API no mesmo projeto Google Cloud.',
      { duration: 16_000 }
    );
    return;
  }

  try {
    const { auth, googleProvider, signInWithPopup, signInWithRedirect } = await import('../firebase');
    const { GoogleAuthProvider } = await import('firebase/auth');

    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (popupErr: unknown) {
      const pe = popupErr as { code?: string; message?: string };
      if (pe?.code === 'auth/popup-closed-by-user') {
        toast.info('Conexão cancelada: o pop-up foi fechado.');
        return;
      }
      if (pe?.code === 'auth/cancelled-popup-request') {
        toast.info('Uma solicitação de pop-up já está em andamento.');
        return;
      }

      const msg = String(pe?.message || '');
      const invalidOAuthAction = /requested action is invalid|the requested action is invalid/i.test(msg);
      const useSameTabRedirect =
        pe?.code === 'auth/popup-blocked' ||
        pe?.code === 'auth/operation-not-supported-in-this-environment' ||
        invalidOAuthAction ||
        /invalid.*action/i.test(msg);

      if (useSameTabRedirect) {
        if (invalidOAuthAction) {
          toast.warning(
            'O Firebase devolveu “ação inválida”. Confirma: projeto Firebase certo no código, Authentication → Google ativo, Settings → Authorized domains com este site (com e sem www), e no Google Cloud o ecrã OAuth + Calendar API no projeto ligado ao Firebase.',
            { duration: 12_000 }
          );
        } else {
          toast.info('Abrindo login do Google nesta mesma aba (evita bloqueio de pop-up)…');
        }
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw popupErr;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      toast.error(
        'Login ok, mas o token do Google Calendar não foi devolvido. No Google Cloud Console, ative a API Calendar e verifique os escopos OAuth; no Firebase, confira o provedor Google.'
      );
      return;
    }

    googleCalendarService.setFirebaseToken(token);
    toast.success('Conectado ao Google Agenda com sucesso!');

    const { syncDueTasksToGoogleAndSupabase } = await import('./googleCalendarTaskSync');
    const tasksWithDue = tasks.filter((t) => t.dueDate);
    if (tasksWithDue.length > 0) {
      toast.info(`Sincronizando ${tasksWithDue.length} tarefa(s) com prazo...`);
    }
    const { successCount, withDueCount } = await syncDueTasksToGoogleAndSupabase(tasks, subjects);

    if (withDueCount === 0) {
      toast.info('Nenhuma tarefa com prazo para sincronizar.');
    } else if (successCount > 0) {
      toast.success(
        `${successCount} tarefa(s) enviadas ao Google Agenda (novas ou atualizadas). Calendário principal · título com [SanFran].`
      );
    } else {
      toast.error('Não foi possível sincronizar as tarefas com o Google Agenda.');
    }

    await onAfterSync?.();
    await onReloadGoogleExternalEvents?.();
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'auth/unauthorized-domain') {
      toast.error('Domínio não autorizado no Firebase (Authentication → Settings → Authorized domains).');
      console.error('Domínio atual:', window.location.hostname);
    } else if (e?.code === 'auth/operation-not-allowed') {
      toast.error('Login com Google desativado no Firebase. Ative em Authentication → Sign-in method → Google.');
    } else if (e?.code === 'auth/internal-error') {
      toast.error(
        'Erro interno do Firebase ao abrir o Google. Tente de novo, permita pop-ups ou use outro navegador.'
      );
    } else {
      console.error('Error syncing with Google:', err);
      toast.error(`Erro ao conectar com o Google Agenda: ${e?.message || 'Erro desconhecido'}`);
    }
  }
}
