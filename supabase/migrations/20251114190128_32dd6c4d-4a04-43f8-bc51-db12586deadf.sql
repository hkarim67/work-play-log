-- Create table for dumped tasks (uncategorized quick captures)
CREATE TABLE IF NOT EXISTS public.flora_dumped_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.flora_dumped_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own dumped tasks" 
ON public.flora_dumped_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dumped tasks" 
ON public.flora_dumped_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dumped tasks" 
ON public.flora_dumped_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_flora_dumped_tasks_user_id ON public.flora_dumped_tasks(user_id);
CREATE INDEX idx_flora_dumped_tasks_created_at ON public.flora_dumped_tasks(created_at DESC);