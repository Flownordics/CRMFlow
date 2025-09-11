-- Add Google sync fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS sync_state TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS google_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS resource_id TEXT;

-- Add resource_id and expiration fields to user_integrations table
ALTER TABLE user_integrations 
ADD COLUMN IF NOT EXISTS resource_id TEXT,
ADD COLUMN IF NOT EXISTS expiration TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_events_sync_state ON events(sync_state);
CREATE INDEX IF NOT EXISTS idx_user_integrations_resource_id ON user_integrations(resource_id);

-- Update RLS policies to allow the webhook function to access events
-- The webhook function runs with service role, so it can access all data

-- Add comment to document the new fields
COMMENT ON COLUMN events.google_sync_enabled IS 'Whether this event should sync to Google Calendar';
COMMENT ON COLUMN events.resource_id IS 'Google Calendar resource ID for push notifications';
COMMENT ON COLUMN user_integrations.resource_id IS 'Google Calendar resource ID for push notifications';
COMMENT ON COLUMN user_integrations.expiration IS 'When the Google Calendar push notification expires';
