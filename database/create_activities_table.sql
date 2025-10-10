-- Create activities table for logging deal activities
-- This table stores timeline events for deals

-- Activities (timeline)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- e.g. "stage_changed", "doc_created", "email_sent"
  deal_id uuid references public.deals(id) on delete cascade,
  user_id uuid, -- auth.users.id if available
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Create index for efficient querying
create index if not exists idx_activities_deal on public.activities (deal_id, created_at desc);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policy for inserting activities (anyone can insert)
CREATE POLICY "Enable insert for authenticated users only" ON public.activities
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for selecting activities (users can see activities for deals they have access to)
CREATE POLICY "Enable select for users based on deal access" ON public.activities
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    -- Users can see activities for deals they own
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = activities.deal_id 
      AND deals.owner_user_id = auth.uid()
    )
    OR
    -- Users can see activities for deals they created
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = activities.deal_id 
      AND deals.created_by = auth.uid()
    )
    OR
    -- Users can see their own activities
    activities.user_id = auth.uid()
  )
);

-- Policy for updating activities (users can update their own activities)
CREATE POLICY "Enable update for users based on user_id" ON public.activities
FOR UPDATE USING (auth.role() = 'authenticated' AND activities.user_id = auth.uid());

-- Policy for deleting activities (users can delete their own activities)
CREATE POLICY "Enable delete for users based on user_id" ON public.activities
FOR DELETE USING (auth.role() = 'authenticated' AND activities.user_id = auth.uid());
