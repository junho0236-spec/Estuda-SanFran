-- =============================================================================
-- Notificações (notifications) — Adicionar coluna 'type' se ausente
-- Rode no SQL Editor do Supabase se desejar habilitar tipos de notificação no banco
-- =============================================================================

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text;

-- Índice para acelerar filtros de tipos de notificação (ex: friend_request, delegated, completed)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON public.notifications (user_id, type);
