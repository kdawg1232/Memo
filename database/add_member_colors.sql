-- Add Member Colors Migration
-- This migration adds a color field to the group_members table
-- so each member can have a custom color for their pins in each group

-- Add the pin_color column to group_members table
ALTER TABLE public.group_members 
ADD COLUMN IF NOT EXISTS pin_color TEXT DEFAULT '#FF6B35' 
CHECK (pin_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add index for color queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_group_members_pin_color ON public.group_members(pin_color);

-- Add comment for documentation
COMMENT ON COLUMN public.group_members.pin_color IS 'Hex color code for member pins on map (format: #RRGGBB, default: #FF6B35 orange)';

-- Update some existing members with different default colors for variety
-- This gives each existing member a unique color in their groups
UPDATE public.group_members 
SET pin_color = CASE 
    WHEN role = 'owner' THEN '#FF6B35'   -- Orange for owners
    WHEN role = 'admin' THEN '#4ECDC4'   -- Teal for admins  
    ELSE '#FFA726'                        -- Light orange for members
END
WHERE pin_color = '#FF6B35'; -- Only update those with the default color

-- Grant necessary permissions
GRANT UPDATE (pin_color) ON public.group_members TO authenticated; 