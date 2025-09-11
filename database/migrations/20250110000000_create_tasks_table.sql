-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Due date and timing
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Related entities
    related_type TEXT CHECK (related_type IN ('deal', 'quote', 'order', 'invoice', 'company', 'person')),
    related_id UUID,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_private BOOLEAN DEFAULT false,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_related ON tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (user_id = auth.uid());

-- Create task comments table for activity tracking
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for task comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task comments
CREATE POLICY "Users can view task comments for their own tasks" ON task_comments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert task comments for their own tasks" ON task_comments
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM tasks 
            WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

-- Create task activities table for timeline
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'updated', 'assigned', 'completed', 'cancelled', 'commented')),
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for task activities
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task activities
CREATE POLICY "Users can view task activities for their own tasks" ON task_activities
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert task activities for their own tasks" ON task_activities
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM tasks 
            WHERE user_id = auth.uid()
        ) AND user_id = auth.uid()
    );

-- Create function to automatically create task activities
CREATE OR REPLACE FUNCTION create_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert activity record
    INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, description)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.user_id, OLD.user_id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'created'
            WHEN TG_OP = 'UPDATE' THEN 'updated'
            WHEN TG_OP = 'DELETE' THEN 'deleted'
        END,
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Task created'
            WHEN TG_OP = 'UPDATE' THEN 'Task updated'
            WHEN TG_OP = 'DELETE' THEN 'Task deleted'
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task activities
CREATE TRIGGER trigger_create_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_task_activity();
