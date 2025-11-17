-- Add end_date column to flora_scheduled_tasks to support multi-day tasks
ALTER TABLE public.flora_scheduled_tasks 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Set end_date to scheduled_date for existing tasks (same day tasks)
UPDATE public.flora_scheduled_tasks
SET end_date = scheduled_date
WHERE end_date IS NULL;

-- Make end_date NOT NULL now that we've backfilled
ALTER TABLE public.flora_scheduled_tasks
ALTER COLUMN end_date SET NOT NULL;

-- Add a check constraint to ensure end_date >= scheduled_date
ALTER TABLE public.flora_scheduled_tasks
ADD CONSTRAINT scheduled_tasks_date_order CHECK (end_date >= scheduled_date);