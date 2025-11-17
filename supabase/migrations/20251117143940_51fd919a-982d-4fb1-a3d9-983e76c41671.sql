-- Add updated_at column to flora_scheduled_tasks for better sync tracking
ALTER TABLE public.flora_scheduled_tasks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_flora_scheduled_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flora_scheduled_tasks_updated_at
BEFORE UPDATE ON public.flora_scheduled_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_flora_scheduled_tasks_updated_at();

-- Backfill existing records to use created_at as initial updated_at
UPDATE public.flora_scheduled_tasks
SET updated_at = created_at
WHERE updated_at IS NULL;