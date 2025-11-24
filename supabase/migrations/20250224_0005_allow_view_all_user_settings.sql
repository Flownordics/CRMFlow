-- Allow authenticated users to view all user_settings for task assignment
-- This is needed so users can see all system users in "Assign To" dropdowns

-- Add a new SELECT policy that allows all authenticated users to view user_settings
-- (but they can still only UPDATE/INSERT/DELETE their own)
CREATE POLICY "Authenticated users can view all user settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (true);

-- Note: The existing policies for INSERT/UPDATE/DELETE remain unchanged
-- Users can still only modify their own settings

