-- Tabela para o Radar de Editais
-- Execute este comando no SQL Editor do seu projeto Supabase

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

-- Habilitar RLS (Row Level Security)
ALTER TABLE editais ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (todos podem ver os editais)
CREATE POLICY "Permitir leitura pública de editais" ON editais
  FOR SELECT USING (true);

-- Política para inserção/edição (apenas admins ou usuários autenticados para teste)
-- Em produção, você deve restringir isso apenas a administradores.
CREATE POLICY "Permitir inserção para usuários autenticados" ON editais
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização para usuários autenticados" ON editais
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO editais (title, institution, status, category, salary, deadline, region, link, description)
VALUES 
('Magistratura Federal - TRF3', 'TRF 3ª Região', 'Aberto', 'Magistratura', 'R$ 35.845,00', '2024-05-20', 'SP/MS', 'https://www.trf3.jus.br/', 'Concurso para Juiz Federal Substituto. 20 vagas imediatas + CR.'),
('Ministério Público de São Paulo', 'MPSP', 'Previsto', 'MP', 'R$ 32.355,00', NULL, 'São Paulo', NULL, '96º Concurso de Ingresso na Carreira do Ministério Público. Comissão formada.'),
('Defensoria Pública do Rio de Janeiro', 'DPGE RJ', 'Inscrições Abertas', 'Defensoria', 'R$ 29.600,00', '2024-04-15', 'Rio de Janeiro', 'https://www.defensoria.rj.def.br/', 'XXVIII Concurso para ingresso na classe inicial da carreira de Defensor Público.');

-- Tabela para Trilha da Aprovação
CREATE TABLE IF NOT EXISTS user_trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL, -- magistratura, mp, defensoria, procuradoria
  current_step_id TEXT,
  completed_steps TEXT[], -- Array de IDs de passos concluídos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal)
);

-- Habilitar RLS
ALTER TABLE user_trails ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só vê sua própria trilha
CREATE POLICY "Usuários podem ver suas próprias trilhas" ON user_trails
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuário pode criar/atualizar sua própria trilha
CREATE POLICY "Usuários podem gerenciar suas próprias trilhas" ON user_trails
  FOR ALL USING (auth.uid() = user_id);

-- SISTEMA DE CHAT (CONNECT)
-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT, -- Para grupos
  is_group BOOLEAN DEFAULT false,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para Chat
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para Chat
CREATE POLICY "Participantes podem ver suas salas" ON chat_rooms
  FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants WHERE room_id = chat_rooms.id AND user_id = auth.uid()));

CREATE POLICY "Participantes podem ver outros participantes" ON chat_participants
  FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants p WHERE p.room_id = chat_participants.room_id AND p.user_id = auth.uid()));

CREATE POLICY "Participantes podem gerenciar seu status" ON chat_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Participantes podem ver mensagens" ON chat_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants WHERE room_id = chat_messages.room_id AND user_id = auth.uid()));

CREATE POLICY "Participantes podem enviar mensagens" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM chat_participants WHERE room_id = chat_messages.room_id AND user_id = auth.uid()));

-- Funções Auxiliares
CREATE OR REPLACE FUNCTION find_common_room(user1 UUID, user2 UUID)
RETURNS TABLE (room_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT p1.room_id
  FROM chat_participants p1
  JOIN chat_participants p2 ON p1.room_id = p2.room_id
  JOIN chat_rooms r ON p1.room_id = r.id
  WHERE p1.user_id = user1
    AND p2.user_id = user2
    AND r.is_group = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_unread_count(p_room_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_participants
  SET unread_count = unread_count + 1
  WHERE room_id = p_room_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar Realtime (Execute no painel do Supabase ou via SQL se tiver permissão)
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link_task TEXT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários podem ver suas próprias notificações" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas notificações" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir notificações" ON notifications
  FOR INSERT WITH CHECK (true);

-- SISTEMA DE AMIZADES (FRIENDS)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Quem enviou
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Quem recebeu
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Habilitar RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários podem ver suas próprias amizades" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Usuários podem enviar solicitações" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem responder a solicitações" ON friendships
  FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- CONFIGURAÇÃO DE STORAGE (ARQUIVOS DO CHAT)
-- 1. Criar o Bucket (Se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Segurança para o Storage
-- Permitir que usuários autenticados façam upload
CREATE POLICY "Permitir upload para usuários autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat_attachments' AND auth.role() = 'authenticated');

-- Permitir que participantes vejam os arquivos (Simplificado: usuários autenticados podem ver se souberem a URL)
-- Para maior segurança, a lógica de "apenas participantes" exigiria uma função complexa no storage.objects
CREATE POLICY "Permitir leitura para usuários autenticados" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat_attachments' AND auth.role() = 'authenticated');

-- Permitir que o dono delete seu próprio arquivo
CREATE POLICY "Permitir delete pelo dono" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat_attachments' AND auth.uid() = owner);
