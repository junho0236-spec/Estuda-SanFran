-- ===============================================================
-- SANFRAN ACADEMY - FINAL SUPABASE SETUP
-- ===============================================================
-- Execute este script no SQL Editor do seu projeto Supabase.
-- Ele configura todas as tabelas, políticas e funções necessárias.

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PERFIS DE USUÁRIO (PROFILES)
-- Esta tabela espelha os usuários do auth.users para permitir metadados públicos
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  persona_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para Perfis
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas
DROP POLICY IF EXISTS "Perfis são visíveis para todos os autenticados" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;

CREATE POLICY "Perfis são visíveis para todos os autenticados" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABELAS DE CHAT (CONNECT)
-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT, -- Nome para grupos
  avatar_url TEXT, -- Avatar para grupos
  is_group BOOLEAN DEFAULT false,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar TEXT,
  unread_count INTEGER DEFAULT 0,
  is_typing BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT,
  content TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  status TEXT CHECK (status IN ('sent', 'delivered', 'read')) DEFAULT 'sent',
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_forwarded BOOLEAN DEFAULT FALSE,
  forwarded_from_name TEXT,
  link_preview JSONB,
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  reply_to_content TEXT,
  reply_to_sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para Chat
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas
DROP POLICY IF EXISTS "Participantes podem ver suas salas" ON chat_rooms;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode criar salas" ON chat_rooms;
DROP POLICY IF EXISTS "Participantes podem atualizar suas salas" ON chat_rooms;
DROP POLICY IF EXISTS "Participantes podem ver outros participantes" ON chat_participants;
DROP POLICY IF EXISTS "Participantes podem ser adicionados a salas" ON chat_participants;
DROP POLICY IF EXISTS "Participantes podem gerenciar seu status" ON chat_participants;
DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON chat_messages;
DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON chat_messages;
DROP POLICY IF EXISTS "Participantes podem atualizar suas mensagens" ON chat_messages;

-- Função auxiliar para verificar participação
CREATE OR REPLACE FUNCTION check_is_room_participant(p_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE room_id = p_room_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas Chat
CREATE POLICY "Participantes podem ver suas salas" ON chat_rooms FOR SELECT USING (check_is_room_participant(id));
CREATE POLICY "Qualquer usuário autenticado pode criar salas" ON chat_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Participantes podem atualizar suas salas" ON chat_rooms FOR UPDATE USING (check_is_room_participant(id));

CREATE POLICY "Participantes podem ver outros participantes" ON chat_participants FOR SELECT USING (check_is_room_participant(room_id));
CREATE POLICY "Participantes podem ser adicionados a salas" ON chat_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Participantes podem gerenciar seu status" ON chat_participants FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Participantes podem ver mensagens" ON chat_messages FOR SELECT USING (check_is_room_participant(room_id));
CREATE POLICY "Participantes podem enviar mensagens" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND check_is_room_participant(room_id));
CREATE POLICY "Participantes podem atualizar suas mensagens" ON chat_messages FOR UPDATE USING (auth.uid() = sender_id);

-- Chat Reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- 8. MENSAGENS FAVORITAS (CHAT_FAVORITES)
CREATE TABLE IF NOT EXISTS chat_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- 9. ENQUETES (CHAT_POLLS)
CREATE TABLE IF NOT EXISTS chat_polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. VOTOS DE ENQUETES (CHAT_POLL_VOTES)
CREATE TABLE IF NOT EXISTS chat_poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES chat_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE chat_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_poll_votes ENABLE ROW LEVEL SECURITY;

-- Políticas para novas tabelas
DROP POLICY IF EXISTS "Usuários podem ver seus favoritos" ON chat_favorites;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus favoritos" ON chat_favorites;
CREATE POLICY "Usuários podem ver seus favoritos" ON chat_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem gerenciar seus favoritos" ON chat_favorites FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Participantes podem ver enquetes" ON chat_polls;
DROP POLICY IF EXISTS "Participantes podem criar enquetes" ON chat_polls;
CREATE POLICY "Participantes podem ver enquetes" ON chat_polls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = chat_polls.message_id AND check_is_room_participant(m.room_id)
  )
);
CREATE POLICY "Participantes podem criar enquetes" ON chat_polls FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = message_id AND auth.uid() = m.sender_id AND check_is_room_participant(m.room_id)
  )
);

DROP POLICY IF EXISTS "Participantes podem ver votos" ON chat_poll_votes;
DROP POLICY IF EXISTS "Participantes podem votar" ON chat_poll_votes;
DROP POLICY IF EXISTS "Participantes podem atualizar seus votos" ON chat_poll_votes;
CREATE POLICY "Participantes podem ver votos" ON chat_poll_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_polls poll
    JOIN chat_messages m ON poll.message_id = m.id
    WHERE poll.id = chat_poll_votes.poll_id AND check_is_room_participant(m.room_id)
  )
);
CREATE POLICY "Participantes podem votar" ON chat_poll_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM chat_polls poll
    JOIN chat_messages m ON poll.message_id = m.id
    WHERE poll.id = poll_id AND check_is_room_participant(m.room_id)
  )
);
CREATE POLICY "Participantes podem atualizar seus votos" ON chat_poll_votes FOR UPDATE USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM chat_polls poll
    JOIN chat_messages m ON poll.message_id = m.id
    WHERE poll.id = poll_id AND check_is_room_participant(m.room_id)
  )
);

DROP POLICY IF EXISTS "Participantes podem ver reações" ON chat_reactions;
DROP POLICY IF EXISTS "Participantes podem reagir a mensagens" ON chat_reactions;
DROP POLICY IF EXISTS "Participantes podem remover suas reações" ON chat_reactions;

CREATE POLICY "Participantes podem ver reações" ON chat_reactions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_messages m
      WHERE m.id = message_id AND check_is_room_participant(m.room_id)
    )
  );

CREATE POLICY "Participantes podem reagir a mensagens" ON chat_reactions 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chat_messages m
      WHERE m.id = message_id AND check_is_room_participant(m.room_id)
    )
  );

CREATE POLICY "Participantes podem remover suas reações" ON chat_reactions 
  FOR DELETE USING (auth.uid() = user_id);

-- 4. PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam suas próprias inscrições" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;

CREATE POLICY "Usuários gerenciam suas próprias inscrições" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- 5. OUTRAS TABELAS (EDITAIS, TRILHAS, AMIZADES)
-- Editais
CREATE TABLE IF NOT EXISTS editais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  institution TEXT,
  status TEXT CHECK (status IN ('Aberto', 'Previsto', 'Inscrições Abertas', 'Encerrado')),
  category TEXT CHECK (category IN ('Magistratura', 'MP', 'Defensoria', 'Procuradoria', 'Outros')),
  salary TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  region TEXT,
  link TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE editais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de editais" ON editais;
DROP POLICY IF EXISTS "Escrita para autenticados" ON editais;
CREATE POLICY "Leitura pública de editais" ON editais FOR SELECT USING (true);
CREATE POLICY "Escrita para autenticados" ON editais FOR ALL USING (auth.role() = 'authenticated');

-- User Trails
CREATE TABLE IF NOT EXISTS user_trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  current_step_id TEXT,
  completed_steps TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal)
);

ALTER TABLE user_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários veem suas próprias trilhas" ON user_trails;
CREATE POLICY "Usuários veem suas próprias trilhas" ON user_trails FOR ALL USING (auth.uid() = user_id);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários veem suas amizades" ON friendships;
DROP POLICY IF EXISTS "Usuários enviam solicitações" ON friendships;
DROP POLICY IF EXISTS "Usuários respondem solicitações" ON friendships;
CREATE POLICY "Usuários veem suas amizades" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Usuários enviam solicitações" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários respondem solicitações" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link_task TEXT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários veem suas notificações" ON notifications;
CREATE POLICY "Usuários veem suas notificações" ON notifications FOR ALL USING (auth.uid() = user_id);

-- 6. STORAGE (BUCKET: chat-attachments)
-- Criar o Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas Storage
DROP POLICY IF EXISTS "Permitir upload para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete pelo dono" ON storage.objects;

CREATE POLICY "Permitir upload para autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para autenticados" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir delete pelo dono" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-attachments' AND auth.uid() = owner);

-- 7. REALTIME
-- Nota: Você deve habilitar o Realtime para as tabelas chat_messages, chat_participants e chat_rooms 
-- no painel de controle do Supabase (Database -> Replication -> supabase_realtime).
-- Ou via SQL se tiver permissões de superuser:
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages, chat_participants, chat_rooms;

-- 8. TRIGGERS
-- Atualizar is_edited e updated_at nas mensagens
CREATE OR REPLACE FUNCTION handle_message_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.is_edited := TRUE;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_update ON chat_messages;
CREATE TRIGGER on_message_update
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_update();
