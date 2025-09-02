-- Native Calendar Seed Data
-- Run this after the migration to add demo events
-- Only creates events for authenticated users

-- Demo Meeting
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

-- Project Deadline
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

-- Client Call
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

-- Verification
SELECT 
    'demo_events' as check_type,
    COUNT(*) as event_count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ DEMO EVENTS CREATED'
        ELSE '⚠️  NO DEMO EVENTS (check if user is authenticated)'
    END as status
FROM public.events 
WHERE title IN ('Demo Meeting', 'Project Deadline', 'Client Call');
