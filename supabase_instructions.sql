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
