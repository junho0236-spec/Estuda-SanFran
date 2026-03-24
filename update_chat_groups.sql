-- Update chat_rooms to support group management
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RLS for chat_rooms to allow creator to update
CREATE POLICY "Criadores podem atualizar suas salas" ON chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Update RLS for chat_participants to allow creator to manage members
CREATE POLICY "Criadores podem gerenciar participantes" ON chat_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = chat_participants.room_id AND created_by = auth.uid()
    )
  );

-- Ensure existing rooms have a creator (optional, but good for consistency)
-- For now, we'll leave it as NULL for old rooms.
