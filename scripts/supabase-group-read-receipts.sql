-- Leituras em grupo: rastreia quando cada participante marcou a conversa como lida.
-- Cole no SQL Editor do Supabase.
--
-- Se você JÁ TEM public.mark_messages_as_read com outra lógica, faça backup e mescle:
-- adicione "last_read_at = now()" no UPDATE de chat_participants (além do que já faz).

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_room_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.chat_participants
  SET
    unread_count = 0,
    last_read_at = now()
  WHERE room_id = p_room_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(uuid, uuid) TO authenticated;
