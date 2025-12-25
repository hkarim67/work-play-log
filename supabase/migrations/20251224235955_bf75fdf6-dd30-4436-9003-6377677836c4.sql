-- Add columns for fixed/recurring tasks
ALTER TABLE public.flora_tasks 
ADD COLUMN is_fixed boolean NOT NULL DEFAULT false,
ADD COLUMN recurrence text DEFAULT NULL,
ADD COLUMN last_completed_date date DEFAULT NULL;

-- Add check constraint for valid recurrence values
ALTER TABLE public.flora_tasks 
ADD CONSTRAINT flora_tasks_recurrence_check 
CHECK (recurrence IS NULL OR recurrence IN ('daily', 'weekly', 'monthly'));