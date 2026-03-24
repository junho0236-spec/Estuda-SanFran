-- Update chat_participants to support pinning
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_is_pinned ON chat_participants(user_id, is_pinned);
