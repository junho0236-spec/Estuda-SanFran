-- ===============================================================
-- SANFRAN ACADEMY - FINAL SUPABASE SETUP
-- ===============================================================
-- Execute este script no SQL Editor do seu projeto Supabase.
-- Ele configura todas as tabelas, políticas e funções necessárias.

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. LIMPEZA DE POLÍTICAS ANTIGAS (IDEMPOTÊNCIA)
-- Executamos os DROPs antes de criar qualquer coisa para evitar erros de "already exists"
DROP POLICY IF EXISTS "Perfis são visíveis para todos os autenticados" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Participantes podem ver suas salas" ON chat_rooms;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode criar salas" ON chat_rooms;
DROP POLICY IF EXISTS "Participantes podem atualizar suas salas" ON chat_rooms;
DROP POLICY IF EXISTS "Participantes podem ver outros participantes" ON chat_participants;
DROP POLICY IF EXISTS "Participantes podem ser adicionados a salas" ON chat_participants;
DROP POLICY IF EXISTS "Participantes podem gerenciar seu status" ON chat_participants;
DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON chat_messages;
DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON chat_messages;
DROP POLICY IF EXISTS "Participantes podem atualizar suas mensagens" ON chat_messages;
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias inscrições" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Leitura pública de editais" ON editais;
DROP POLICY IF EXISTS "Escrita para autenticados" ON editais;
DROP POLICY IF EXISTS "Usuários veem suas próprias trilhas" ON user_trails;
DROP POLICY IF EXISTS "Usuários veem suas amizades" ON friendships;
DROP POLICY IF EXISTS "Usuários enviam solicitações" ON friendships;
DROP POLICY IF EXISTS "Usuários respondem solicitações" ON friendships;
DROP POLICY IF EXISTS "Usuários veem suas notificações" ON notifications;
DROP POLICY IF EXISTS "Permitir upload para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete pelo dono" ON storage.objects;

-- 3. PERFIS DE USUÁRIO (PROFILES)
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
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  reply_to_content TEXT,
  reply_to_sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- 4. OUTRAS TABELAS (EDITAIS, TRILHAS, AMIZADES)
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

-- 5. SEGURANÇA (RLS)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Políticas Push
CREATE POLICY "Usuários gerenciam suas próprias inscrições" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Políticas Editais
CREATE POLICY "Leitura pública de editais" ON editais FOR SELECT USING (true);
CREATE POLICY "Escrita para autenticados" ON editais FOR ALL USING (auth.role() = 'authenticated');

-- Políticas Trilhas
CREATE POLICY "Usuários veem suas próprias trilhas" ON user_trails FOR ALL USING (auth.uid() = user_id);

-- Políticas Amizades
CREATE POLICY "Usuários veem suas amizades" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Usuários enviam solicitações" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários respondem solicitações" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Políticas Notificações
CREATE POLICY "Usuários veem suas notificações" ON notifications FOR ALL USING (auth.uid() = user_id);

-- 6. STORAGE (BUCKET: chat-attachments)
-- Criar o Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas Storage
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
