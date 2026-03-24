-- Add new columns to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_content TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_sender_name TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add last_seen column to user_persona
ALTER TABLE user_persona ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Function to handle message updates (editing)
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

-- Trigger for message updates
DROP TRIGGER IF EXISTS on_message_update ON chat_messages;
CREATE TRIGGER on_message_update
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_update();
