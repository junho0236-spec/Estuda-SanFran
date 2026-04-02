-- Cole no SQL Editor do Supabase (uma vez). Ajuste nomes de colunas se o schema divergir.
-- Requer: tabelas public.chat_messages, public.chat_rooms, public.chat_participants, public.chat_polls
-- Moderação de grupo: coluna chat_participants.join_status (active|pending). Rode scripts/supabase-group-moderation.sql antes.

CREATE OR REPLACE FUNCTION public.post_chat_message(
  p_room_id uuid,
  p_sender_id uuid,
  p_sender_name text,
  p_content text DEFAULT '',
  p_message_type text DEFAULT 'text',
  p_status text DEFAULT 'sent',
  p_reply_to_id uuid DEFAULT NULL,
  p_reply_to_content text DEFAULT NULL,
  p_reply_to_sender_name text DEFAULT NULL,
  p_link_preview jsonb DEFAULT NULL,
  p_is_vanish boolean DEFAULT false,
  p_expires_at timestamptz DEFAULT NULL,
  p_attachment_url text DEFAULT NULL,
  p_attachment_name text DEFAULT NULL,
  p_attachment_type text DEFAULT NULL,
  p_shared_profile_id uuid DEFAULT NULL,
  p_is_forwarded boolean DEFAULT false,
  p_forwarded_from_name text DEFAULT NULL,
  p_thread_root_id uuid DEFAULT NULL
)
RETURNS SETOF public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.chat_messages%ROWTYPE;
  v_last text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = p_room_id
      AND cp.user_id = p_sender_id
      AND cp.join_status = 'active'
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  IF p_thread_root_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_messages root
      WHERE root.id = p_thread_root_id
        AND root.room_id = p_room_id
        AND root.thread_root_id IS NULL
    ) THEN
      RAISE EXCEPTION 'invalid thread root';
    END IF;
  END IF;

  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    sender_name,
    content,
    message_type,
    status,
    reply_to_id,
    reply_to_content,
    reply_to_sender_name,
    link_preview,
    is_vanish,
    expires_at,
    attachment_url,
    attachment_name,
    attachment_type,
    shared_profile_id,
    is_forwarded,
    forwarded_from_name,
    thread_root_id
  ) VALUES (
    p_room_id,
    p_sender_id,
    p_sender_name,
    COALESCE(p_content, ''),
    COALESCE(NULLIF(trim(p_message_type), ''), 'text'),
    COALESCE(NULLIF(trim(p_status), ''), 'sent'),
    p_reply_to_id,
    p_reply_to_content,
    p_reply_to_sender_name,
    p_link_preview,
    COALESCE(p_is_vanish, false),
    p_expires_at,
    p_attachment_url,
    p_attachment_name,
    p_attachment_type,
    p_shared_profile_id,
    COALESCE(p_is_forwarded, false),
    p_forwarded_from_name,
    p_thread_root_id
  )
  RETURNING * INTO v_msg;

  v_last := CASE
    WHEN p_thread_root_id IS NOT NULL THEN
      left(
        '💬 ' || (
          CASE
            WHEN length(trim(COALESCE(p_content, ''))) > 0 THEN trim(p_content)
            WHEN COALESCE(NULLIF(trim(p_message_type), ''), 'text') = 'gif' THEN 'GIF (tópico)'
            WHEN COALESCE(NULLIF(trim(p_message_type), ''), 'text') = 'sticker' THEN 'Figurinha (tópico)'
            WHEN COALESCE(NULLIF(trim(p_message_type), ''), 'text') = 'audio' THEN 'Áudio (tópico)'
            WHEN p_attachment_url IS NOT NULL THEN
              CASE
                WHEN p_attachment_name IS NOT NULL AND length(trim(p_attachment_name)) > 0
                  THEN 'Arquivo: ' || trim(p_attachment_name)
                ELSE 'Arquivo (tópico)'
              END
            ELSE 'Tópico'
          END
        ),
        500
      )
    WHEN length(trim(COALESCE(p_content, ''))) > 0 THEN left(trim(p_content), 500)
    WHEN COALESCE(NULLIF(trim(p_message_type), ''), 'text') = 'gif' THEN 'GIF'
    WHEN COALESCE(NULLIF(trim(p_message_type), ''), 'text') = 'sticker' THEN 'Figurinha'
    WHEN COALESCE(NULLIF(trim(p_message_type), ''), 'text') = 'audio' THEN 'Mensagem de voz'
    WHEN p_attachment_url IS NOT NULL THEN
      CASE
        WHEN p_attachment_name IS NOT NULL AND length(trim(p_attachment_name)) > 0
          THEN left('Arquivo: ' || trim(p_attachment_name), 500)
        ELSE 'Arquivo'
      END
    ELSE 'Nova mensagem'
  END;

  UPDATE public.chat_rooms
  SET
    last_message = v_last,
    updated_at = now()
  WHERE id = p_room_id;

  UPDATE public.chat_participants
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE room_id = p_room_id
    AND user_id <> p_sender_id
    AND join_status = 'active';

  RETURN QUERY SELECT * FROM public.chat_messages WHERE id = v_msg.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_chat_message(
  uuid, uuid, text, text, text, text, uuid, text, text, jsonb, boolean, timestamptz,
  text, text, text, uuid, boolean, text, uuid
) TO authenticated;


-- Opcional: enquete em uma única transação (mensagem + chat_polls + sala + não lidos).
-- Se a coluna options for jsonb, troque a linha do INSERT por: options, to_jsonb(p_options)
CREATE OR REPLACE FUNCTION public.create_chat_poll_message(
  p_room_id uuid,
  p_sender_id uuid,
  p_sender_name text,
  p_question text,
  p_options text[]
)
RETURNS SETOF public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.chat_messages%ROWTYPE;
  v_content text;
  v_room public.chat_rooms%ROWTYPE;
  v_cp public.chat_participants%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = p_room_id
      AND cp.user_id = p_sender_id
      AND cp.join_status = 'active'
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  SELECT * INTO v_room FROM public.chat_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'room not found';
  END IF;

  SELECT * INTO v_cp FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = p_sender_id;

  IF v_room.is_group THEN
    IF v_room.created_by IS NOT DISTINCT FROM p_sender_id THEN
      NULL;
    ELSIF v_cp.group_role IN ('admin', 'co_admin') THEN
      NULL;
    ELSIF COALESCE((v_room.moderation_settings->>'members_can_poll')::boolean, true) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'not allowed to create poll';
    END IF;
  END IF;

  v_content := '📊 ENQUETE: ' || COALESCE(p_question, '');

  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    sender_name,
    content,
    status,
    message_type
  ) VALUES (
    p_room_id,
    p_sender_id,
    p_sender_name,
    v_content,
    'sent',
    'text'
  )
  RETURNING * INTO v_msg;

  -- Se a coluna options for jsonb, use: VALUES (v_msg.id, p_question, to_jsonb(p_options));
  INSERT INTO public.chat_polls (message_id, question, options)
  VALUES (v_msg.id, p_question, p_options);

  UPDATE public.chat_rooms
  SET
    last_message = left(v_content, 500),
    updated_at = now()
  WHERE id = p_room_id;

  UPDATE public.chat_participants
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE room_id = p_room_id
    AND user_id <> p_sender_id
    AND join_status = 'active';

  RETURN QUERY SELECT * FROM public.chat_messages WHERE id = v_msg.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_chat_poll_message(uuid, uuid, text, text, text[]) TO authenticated;
