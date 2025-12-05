-- Allow users to update tasks they are assigned to
-- This ensures that assigned users can update task status, priority, etc.

-- Add policy for users to update tasks assigned to them
CREATE POLICY "Users can update tasks assigned to them"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Note: This allows assigned users to update tasks even if they didn't create them
-- Existing policies remain:
-- - "Users can update their own tasks" (user_id = auth.uid())
-- - "Admins and managers can update all tasks" (role-based)
-- - New: "Users can update tasks assigned to them" (assigned_to = auth.uid()) - for ALL users regardless of role





