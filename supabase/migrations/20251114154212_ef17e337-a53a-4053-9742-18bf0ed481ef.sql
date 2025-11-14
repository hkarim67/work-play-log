-- Create lists table for Flora
CREATE TABLE public.flora_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  color TEXT NOT NULL DEFAULT 'flora-sage',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flora_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for lists
CREATE POLICY "Users can view their own lists"
ON public.flora_lists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
ON public.flora_lists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
ON public.flora_lists
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
ON public.flora_lists
FOR DELETE
USING (auth.uid() = user_id);

-- Create tasks table for Flora
CREATE TABLE public.flora_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  list_id UUID NOT NULL REFERENCES public.flora_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  estimated_minutes INTEGER,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flora_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can view their own tasks"
ON public.flora_tasks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.flora_tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.flora_tasks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.flora_tasks
FOR DELETE
USING (auth.uid() = user_id);

-- Create scheduled_tasks table for calendar functionality
CREATE TABLE public.flora_scheduled_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.flora_tasks(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flora_scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled tasks (through task's user_id)
CREATE POLICY "Users can view their scheduled tasks"
ON public.flora_scheduled_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flora_tasks
    WHERE flora_tasks.id = flora_scheduled_tasks.task_id
    AND flora_tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their scheduled tasks"
ON public.flora_scheduled_tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.flora_tasks
    WHERE flora_tasks.id = flora_scheduled_tasks.task_id
    AND flora_tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their scheduled tasks"
ON public.flora_scheduled_tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.flora_tasks
    WHERE flora_tasks.id = flora_scheduled_tasks.task_id
    AND flora_tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their scheduled tasks"
ON public.flora_scheduled_tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.flora_tasks
    WHERE flora_tasks.id = flora_scheduled_tasks.task_id
    AND flora_tasks.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_flora_lists_user_id ON public.flora_lists(user_id);
CREATE INDEX idx_flora_lists_sort_order ON public.flora_lists(sort_order);
CREATE INDEX idx_flora_tasks_user_id ON public.flora_tasks(user_id);
CREATE INDEX idx_flora_tasks_list_id ON public.flora_tasks(list_id);
CREATE INDEX idx_flora_tasks_completed_at ON public.flora_tasks(completed_at);
CREATE INDEX idx_flora_scheduled_tasks_task_id ON public.flora_scheduled_tasks(task_id);
CREATE INDEX idx_flora_scheduled_tasks_date ON public.flora_scheduled_tasks(scheduled_date);