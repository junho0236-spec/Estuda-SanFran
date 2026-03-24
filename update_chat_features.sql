
-- 1. Table for per-user per-room settings (like wallpapers)
CREATE TABLE IF NOT EXISTS chat_room_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_persona(id),
    room_id UUID NOT NULL REFERENCES chat_rooms(id),
    wallpaper_url TEXT,
    wallpaper_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, room_id)
);

-- 2. Enable RLS for chat_room_settings
ALTER TABLE chat_room_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own room settings" 
ON chat_room_settings FOR ALL 
USING (auth.uid() = user_id);

-- 3. Add message_type to chat_messages to distinguish GIFs/Stickers
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text'; -- 'text', 'gif', 'sticker', 'audio', 'file'

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_room_settings_user_room ON chat_room_settings(user_id, room_id);
