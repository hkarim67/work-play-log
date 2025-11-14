-- Remove timeframe and due_date from objective_categories
ALTER TABLE public.objective_categories
DROP COLUMN IF EXISTS timeframe,
DROP COLUMN IF EXISTS due_date;

-- Add timeframe and due_date to objectives
ALTER TABLE public.objectives
ADD COLUMN timeframe category_timeframe,
ADD COLUMN due_date DATE;