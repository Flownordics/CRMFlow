-- Fix attendees column in events table
-- Ensure the attendees column exists and has the correct type

-- Add attendees column if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN events.attendees IS 'Array of attendees: [{email, name, optional}]';
