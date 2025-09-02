-- Seed data for CRMFlow
-- Run this after schema.sql

-- Insert demo events (only if user exists)
INSERT INTO public.events (
  title,
  description,
  start_at,
  end_at,
  all_day,
  location,
  attendees,
  color,
  kind,
  created_by
) 
SELECT 
  'Demo Meeting',
  'This is a demo meeting to test the native calendar functionality.',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
  false,
  'Conference Room A',
  '[{"email": "demo@example.com", "name": "Demo User", "optional": false}]',
  'primary',
  'meeting',
  auth.uid()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
ON CONFLICT DO NOTHING;

INSERT INTO public.events (
  title,
  description,
  start_at,
  end_at,
  all_day,
  location,
  attendees,
  color,
  kind,
  created_by
) 
SELECT 
  'Project Deadline',
  'Important project deadline that needs attention.',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '3 days',
  true,
  NULL,
  '[]',
  'warning',
  'deadline',
  auth.uid()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
ON CONFLICT DO NOTHING;

INSERT INTO public.events (
  title,
  description,
  start_at,
  end_at,
  all_day,
  location,
  attendees,
  color,
  kind,
  created_by
) 
SELECT 
  'Client Call',
  'Follow-up call with important client.',
  NOW() + INTERVAL '2 days' + INTERVAL '14 hours',
  NOW() + INTERVAL '2 days' + INTERVAL '15 hours',
  false,
  'Zoom Meeting',
  '[{"email": "client@example.com", "name": "Client Name", "optional": true}]',
  'accent',
  'call',
  auth.uid()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
ON CONFLICT DO NOTHING;
