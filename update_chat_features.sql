
-- 1. Add shared_profile_id to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS shared_profile_id UUID REFERENCES user_persona(id);

-- 2. Add category to chat_participants
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Privadas';

-- 3. Create chat_stories table
CREATE TABLE IF NOT EXISTS chat_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_persona(id),
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text', -- 'text' or 'image'
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '24 hours')
);

-- 4. Enable RLS for chat_stories
ALTER TABLE chat_stories ENABLE ROW LEVEL SECURITY;

-- 5. Policies for chat_stories
CREATE POLICY "Stories are viewable by everyone" 
ON chat_stories FOR SELECT 
USING (expires_at > now());

CREATE POLICY "Users can create their own stories" 
ON chat_stories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON chat_stories FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Index for faster story retrieval
CREATE INDEX IF NOT EXISTS idx_chat_stories_expires_at ON chat_stories(expires_at);
