-- Moderação de grupo: papéis (admin/co-admin/membro), aprovação de entrada, permissões em JSON.
-- Ordem: 1) Cole este ficheiro no SQL Editor do Supabase. 2) Volte a aplicar scripts/supabase-post_chat_message.sql
--     do repositório (versão atualizada com checagem join_status e permissão de enquete).

-- -----------------------------------------------------------------------------
-- Colunas
-- -----------------------------------------------------------------------------

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS require_join_approval boolean NOT NULL DEFAULT false;

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS moderation_settings jsonb NOT NULL DEFAULT jsonb_build_object(
    'members_can_poll', true,
    'co_admins_can_add_member', true,
    'co_admins_can_remove_member', true,
    'co_admins_can_edit_info', false,
    'co_admins_can_moderate_joins', true
  );

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS group_role text NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_participants_group_role_check'
  ) THEN
    ALTER TABLE public.chat_participants
      ADD CONSTRAINT chat_participants_group_role_check
      CHECK (group_role IN ('member', 'co_admin', 'admin'));
  END IF;
END $$;

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS join_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_participants_join_status_check'
  ) THEN
    ALTER TABLE public.chat_participants
      ADD CONSTRAINT chat_participants_join_status_check
      CHECK (join_status IN ('active', 'pending'));
  END IF;
END $$;

-- Dono do grupo: papel admin na linha do criador (grupos existentes)
UPDATE public.chat_participants cp
SET group_role = 'admin'
FROM public.chat_rooms r
WHERE cp.room_id = r.id
  AND r.is_group = true
  AND r.created_by IS NOT NULL
  AND cp.user_id = r.created_by;

-- -----------------------------------------------------------------------------
-- Helpers (privados ao schema)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._group_is_owner(r public.chat_rooms, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (r.created_by IS NOT NULL AND r.created_by = uid)
      OR (r.created_by IS NULL AND EXISTS (
        SELECT 1 FROM public.chat_participants x
        WHERE x.room_id = r.id AND x.user_id = uid AND x.group_role = 'admin'
      ));
$$;

CREATE OR REPLACE FUNCTION public._group_can_add_member(r public.chat_rooms, me public.chat_participants)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF me.join_status IS DISTINCT FROM 'active' THEN
    RETURN false;
  END IF;
  IF public._group_is_owner(r, me.user_id) THEN
    RETURN true;
  END IF;
  IF me.group_role = 'co_admin'
     AND COALESCE((r.moderation_settings->>'co_admins_can_add_member')::boolean, true) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._group_can_moderate_joins(r public.chat_rooms, me public.chat_participants)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF me.join_status IS DISTINCT FROM 'active' THEN
    RETURN false;
  END IF;
  IF public._group_is_owner(r, me.user_id) THEN
    RETURN true;
  END IF;
  IF me.group_role = 'co_admin'
     AND COALESCE((r.moderation_settings->>'co_admins_can_moderate_joins')::boolean, true) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.group_add_member(
  p_room_id uuid,
  p_target_user_id uuid,
  p_target_user_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
  me public.chat_participants%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'room not found';
  END IF;
  IF NOT r.is_group THEN
    RAISE EXCEPTION 'not a group';
  END IF;

  SELECT * INTO me FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  IF NOT public._group_can_add_member(r, me) THEN
    RAISE EXCEPTION 'not allowed to add members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = p_room_id AND user_id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'already a participant';
  END IF;

  INSERT INTO public.chat_participants (
    room_id, user_id, user_name, group_role, join_status
  ) VALUES (
    p_room_id,
    p_target_user_id,
    COALESCE(NULLIF(trim(p_target_user_name), ''), 'Usuário'),
    'member',
    CASE WHEN r.require_join_approval THEN 'pending'::text ELSE 'active'::text END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.group_remove_member(
  p_room_id uuid,
  p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
  me public.chat_participants%ROWTYPE;
  tgt public.chat_participants%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  SELECT * INTO me FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = auth.uid();
  IF NOT FOUND OR me.join_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  SELECT * INTO tgt FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'target not found';
  END IF;

  IF r.created_by IS NOT NULL AND p_target_user_id = r.created_by THEN
    RAISE EXCEPTION 'cannot remove group owner';
  END IF;

  IF public._group_is_owner(r, auth.uid()) THEN
    DELETE FROM public.chat_participants
    WHERE room_id = p_room_id AND user_id = p_target_user_id;
    RETURN;
  END IF;

  IF me.group_role = 'co_admin'
     AND COALESCE((r.moderation_settings->>'co_admins_can_remove_member')::boolean, true)
     AND tgt.group_role = 'member' THEN
    DELETE FROM public.chat_participants
    WHERE room_id = p_room_id AND user_id = p_target_user_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'not allowed to remove member';
END;
$$;

CREATE OR REPLACE FUNCTION public.group_update_room_info(
  p_room_id uuid,
  p_name text,
  p_avatar_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
  me public.chat_participants%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  SELECT * INTO me FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = auth.uid();
  IF NOT FOUND OR me.join_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  IF public._group_is_owner(r, auth.uid()) THEN
    UPDATE public.chat_rooms
    SET
      name = p_name,
      avatar_url = p_avatar_url,
      updated_at = now()
    WHERE id = p_room_id;
    RETURN;
  END IF;

  IF me.group_role = 'co_admin'
     AND COALESCE((r.moderation_settings->>'co_admins_can_edit_info')::boolean, false) THEN
    UPDATE public.chat_rooms
    SET
      name = p_name,
      avatar_url = p_avatar_url,
      updated_at = now()
    WHERE id = p_room_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'not allowed to edit group info';
END;
$$;

CREATE OR REPLACE FUNCTION public.group_delete_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  IF NOT public._group_is_owner(r, auth.uid()) THEN
    RAISE EXCEPTION 'only owner can delete group';
  END IF;

  DELETE FROM public.chat_rooms WHERE id = p_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.group_set_participant_role(
  p_room_id uuid,
  p_target_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
  n int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_role NOT IN ('member', 'co_admin') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  IF NOT public._group_is_owner(r, auth.uid()) THEN
    RAISE EXCEPTION 'only owner can change roles';
  END IF;

  IF r.created_by IS NOT NULL AND p_target_user_id = r.created_by THEN
    RAISE EXCEPTION 'cannot change owner role';
  END IF;

  UPDATE public.chat_participants
  SET group_role = p_role
  WHERE room_id = p_room_id AND user_id = p_target_user_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'target not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.group_update_moderation_settings(
  p_room_id uuid,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  IF NOT public._group_is_owner(r, auth.uid()) THEN
    RAISE EXCEPTION 'only owner can change moderation settings';
  END IF;

  UPDATE public.chat_rooms
  SET
    moderation_settings = COALESCE(moderation_settings, '{}'::jsonb) || COALESCE(p_patch, '{}'::jsonb),
    updated_at = now()
  WHERE id = p_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.group_set_require_join_approval(
  p_room_id uuid,
  p_require boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  IF NOT public._group_is_owner(r, auth.uid()) THEN
    RAISE EXCEPTION 'only owner can change join policy';
  END IF;

  UPDATE public.chat_rooms
  SET require_join_approval = COALESCE(p_require, false), updated_at = now()
  WHERE id = p_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.group_approve_join(
  p_room_id uuid,
  p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
  me public.chat_participants%ROWTYPE;
  n int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  SELECT * INTO me FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = auth.uid();
  IF NOT FOUND OR me.join_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  IF NOT public._group_can_moderate_joins(r, me) THEN
    RAISE EXCEPTION 'not allowed to approve joins';
  END IF;

  UPDATE public.chat_participants
  SET join_status = 'active'
  WHERE room_id = p_room_id
    AND user_id = p_target_user_id
    AND join_status = 'pending';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'no pending request for user';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.group_reject_join(
  p_room_id uuid,
  p_target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.chat_rooms%ROWTYPE;
  me public.chat_participants%ROWTYPE;
  n int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO r FROM public.chat_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR NOT r.is_group THEN
    RAISE EXCEPTION 'invalid room';
  END IF;

  SELECT * INTO me FROM public.chat_participants
  WHERE room_id = p_room_id AND user_id = auth.uid();
  IF NOT FOUND OR me.join_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  IF NOT public._group_can_moderate_joins(r, me) THEN
    RAISE EXCEPTION 'not allowed to reject joins';
  END IF;

  DELETE FROM public.chat_participants
  WHERE room_id = p_room_id
    AND user_id = p_target_user_id
    AND join_status = 'pending';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'no pending request for user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.group_add_member(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_update_room_info(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_delete_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_set_participant_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_update_moderation_settings(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_set_require_join_approval(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_approve_join(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_reject_join(uuid, uuid) TO authenticated;
