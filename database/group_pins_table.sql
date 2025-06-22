-- Group Pins Table
-- This table links audio pins to groups, allowing pins to be shared across multiple groups

CREATE TABLE IF NOT EXISTS group_pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    pin_id UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a pin can only be added once per group
    UNIQUE(group_id, pin_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_pins_group_id ON group_pins(group_id);
CREATE INDEX IF NOT EXISTS idx_group_pins_pin_id ON group_pins(pin_id);
CREATE INDEX IF NOT EXISTS idx_group_pins_added_by ON group_pins(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_group_pins_added_at ON group_pins(added_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE group_pins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid "already exists" errors)
DROP POLICY IF EXISTS "Users can view group pins for their groups" ON group_pins;
DROP POLICY IF EXISTS "Users can add pins to their groups" ON group_pins;
DROP POLICY IF EXISTS "Users can remove group pins" ON group_pins;

-- Policy: Users can only see group pins for groups they are members of
CREATE POLICY "Users can view group pins for their groups" ON group_pins
    FOR SELECT USING (
        group_id IN (
            SELECT group_id 
            FROM group_members 
            WHERE user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

-- Policy: Users can add pins to groups they are members of
CREATE POLICY "Users can add pins to their groups" ON group_pins
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id 
            FROM group_members 
            WHERE user_id = auth.uid() 
            AND status = 'accepted'
        )
        AND added_by_user_id = auth.uid()
    );

-- Policy: Users can remove pins they added, or group admins/owners can remove any pins
CREATE POLICY "Users can remove group pins" ON group_pins
    FOR DELETE USING (
        added_by_user_id = auth.uid() -- User can remove pins they added
        OR 
        group_id IN (
            SELECT group_id 
            FROM group_members 
            WHERE user_id = auth.uid() 
            AND status = 'accepted'
            AND role IN ('owner', 'admin') -- Only admins/owners can remove others' pins
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON group_pins TO authenticated; 