-- Allow users to view tasks they are assigned to, regardless of who created them
-- This ensures that when a task is assigned to a user, they can see it

-- Add policy for users to view tasks assigned to them
CREATE POLICY "Users can view tasks assigned to them"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Note: The existing policies remain:
-- - "Users can view their own tasks" (user_id = auth.uid())
-- - "Admins and managers can view all tasks" (role-based)
-- - "Support can view assigned tasks" (role-based, assigned_to = auth.uid())
-- - New: "Users can view tasks assigned to them" (assigned_to = auth.uid()) - for ALL users regardless of role

