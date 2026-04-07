-- =============================================================================
-- Tasks — setup completo (tabelas + RLS) para evitar "apaga e volta no refresh"
-- =============================================================================
-- Sintoma: tarefa some na UI, mas após F5 reaparece.
-- Causa comum: DELETE bloqueado por RLS/policy em public.tasks.
-- Este script é idempotente e seguro para rodar múltiplas vezes.
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

CREATE INDEX IF NOT EXISTS idx_tasks_history_user_archived
  ON public.tasks_history (user_id, archived_at DESC);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_own_or_delegated ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own_or_delegated ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;

CREATE POLICY tasks_select_own_or_delegated
  ON public.tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR delegated_to = auth.uid());

CREATE POLICY tasks_insert_own
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tasks_update_own_or_delegated
  ON public.tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR delegated_to = auth.uid())
  WITH CHECK (user_id = auth.uid() OR delegated_to = auth.uid());

CREATE POLICY tasks_delete_own
  ON public.tasks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

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

