-- Add task dependencies support
-- Tasks can depend on other tasks (blocking relationships)

-- Add depends_on_task_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on ON public.tasks(depends_on_task_id);

-- Add comment
COMMENT ON COLUMN public.tasks.depends_on_task_id IS 'Reference to another task that must be completed before this task can be completed';

