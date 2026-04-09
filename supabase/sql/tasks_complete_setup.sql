-- =============================================================================
-- Tasks — setup completo (tabelas + RLS) para evitar "apaga e volta no refresh"
-- =============================================================================
-- Sintoma: tarefa some na UI, mas após F5 reaparece.
-- Causa comum: DELETE bloqueado por RLS/policy em public.tasks.
-- Este script é idempotente e seguro para rodar múltiplas vezes.
-- Inclui RPC public.archive_completed_tasks() (chamada em dataService.archiveTasks).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  due_date timestamptz,
  completed_at timestamptz,
  category text,
  priority text,
  status text,
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  delegated_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  delegated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  google_event_id text
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS delegated_to uuid REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS delegated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_event_id text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject_id uuid;

CREATE INDEX IF NOT EXISTS idx_tasks_user_created_at ON public.tasks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_to ON public.tasks (delegated_to);

CREATE TABLE IF NOT EXISTS public.tasks_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid,
  title text,
  status text,
  completed_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.tasks_history ADD COLUMN IF NOT EXISTS task_id uuid;
ALTER TABLE public.tasks_history ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.tasks_history ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.tasks_history ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks_history ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT now();
ALTER TABLE public.tasks_history ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_history_user_archived
  ON public.tasks_history (user_id, archived_at DESC);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_own_or_delegated ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own_or_delegated ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own_or_delegated ON public.tasks;

CREATE POLICY tasks_select_own_or_delegated
  ON public.tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR delegated_to = auth.uid());

CREATE POLICY tasks_insert_own
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: dono ou delegado podem editar; WITH CHECK igual evita “sumir” da visão após update.
-- Quem não é dono não pode mudar user_id (ver trigger abaixo) — senão o delegado assumiria a linha.
CREATE POLICY tasks_update_own_or_delegated
  ON public.tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR delegated_to = auth.uid())
  WITH CHECK (user_id = auth.uid() OR delegated_to = auth.uid());

-- DELETE: alinhado à app (DeadArchive / deleteTask com .or user_id, delegated_to).
-- Apenas dono ou delegado apagam a mesma linha; RLS continua a ser o limite final.
CREATE POLICY tasks_delete_own_or_delegated
  ON public.tasks FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR delegated_to = auth.uid());

-- Impede delegado (ou terceiro) de alterar user_id; dono (OLD.user_id) pode transferir se precisar.
CREATE OR REPLACE FUNCTION public.tasks_enforce_owner_on_user_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.user_id IS DISTINCT FROM OLD.user_id
     AND auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Apenas o dono da tarefa pode alterar user_id.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_enforce_owner_on_user_id_change ON public.tasks;
CREATE TRIGGER tasks_enforce_owner_on_user_id_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_enforce_owner_on_user_id_change();
-- Se o Postgres reclamar, use: EXECUTE PROCEDURE public.tasks_enforce_owner_on_user_id_change();

-- -----------------------------------------------------------------------------
-- RPC usada pela app: supabase.rpc('archive_completed_tasks')
-- Arquiva (preenche archived_at) tarefas concluídas em que o utilizador é dono OU
-- delegado. SECURITY INVOKER → aplica RLS; só altera linhas já visíveis pelas policies.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.archive_completed_tasks();

CREATE OR REPLACE FUNCTION public.archive_completed_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks AS t
  SET archived_at = now()
  WHERE t.archived_at IS NULL
    AND (t.user_id = auth.uid() OR t.delegated_to = auth.uid())
    -- App grava concluído como status 'Concluido' e/ou completed_at preenchido.
    AND (t.status = 'Concluido' OR t.completed_at IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_completed_tasks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_completed_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_completed_tasks() TO service_role;

DROP POLICY IF EXISTS tasks_history_select_own ON public.tasks_history;
DROP POLICY IF EXISTS tasks_history_insert_own ON public.tasks_history;
DROP POLICY IF EXISTS tasks_history_update_own ON public.tasks_history;
DROP POLICY IF EXISTS tasks_history_delete_own ON public.tasks_history;

CREATE POLICY tasks_history_select_own
  ON public.tasks_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY tasks_history_insert_own
  ON public.tasks_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tasks_history_update_own
  ON public.tasks_history FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tasks_history_delete_own
  ON public.tasks_history FOR DELETE TO authenticated
  USING (user_id = auth.uid());

