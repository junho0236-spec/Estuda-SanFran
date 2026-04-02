-- Threads leves: coluna thread_root_id + remoção da assinatura antiga de post_chat_message.
-- Ordem: 1) Execute ESTE arquivo no SQL Editor. 2) Execute o arquivo completo
-- scripts/supabase-post_chat_message.sql do repositório (já inclui p_thread_root_id).

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS thread_root_id uuid REFERENCES public.chat_messages (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chat_messages_thread_room_idx
  ON public.chat_messages (room_id, thread_root_id)
  WHERE thread_root_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.post_chat_message(
  uuid, uuid, text, text, text, text, uuid, text, text, jsonb, boolean, timestamptz,
  text, text, text, uuid, boolean, text
);
