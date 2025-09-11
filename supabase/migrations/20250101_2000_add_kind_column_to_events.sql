-- Add kind column to events table if it doesn't exist
-- This fixes the "Could not find the 'kind' column" error

-- Add kind column if it doesn't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS kind text;

-- Add comment to document the column
COMMENT ON COLUMN public.events.kind IS 'Event type: meeting|call|deadline|other';

-- Update any existing events to have a default kind
UPDATE public.events 
SET kind = 'meeting' 
WHERE kind IS NULL;
