
-- 1. Add vanish_mode to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_vanish BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Create chat_calls table for WebRTC signaling
CREATE TABLE IF NOT EXISTS chat_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id),
    caller_id UUID NOT NULL REFERENCES user_persona(id),
    receiver_id UUID NOT NULL REFERENCES user_persona(id),
    type TEXT NOT NULL, -- 'audio' or 'video'
    status TEXT DEFAULT 'ringing', -- 'ringing', 'ongoing', 'ended'
    signaling_data JSONB, -- For WebRTC offer/answer/candidates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS for chat_calls
ALTER TABLE chat_calls ENABLE ROW LEVEL SECURITY;

-- 4. Policies for chat_calls
CREATE POLICY "Calls are viewable by participants" 
ON chat_calls FOR SELECT 
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls" 
ON chat_calls FOR INSERT 
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls" 
ON chat_calls FOR UPDATE 
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 5. Index for faster call retrieval
CREATE INDEX IF NOT EXISTS idx_chat_calls_room_id ON chat_calls(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_calls_status ON chat_calls(status);
