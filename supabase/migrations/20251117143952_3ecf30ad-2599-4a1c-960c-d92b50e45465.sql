-- Fix search_path security issue for the trigger function
DROP FUNCTION IF EXISTS public.update_flora_scheduled_tasks_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_flora_scheduled_tasks_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_flora_scheduled_tasks_updated_at
BEFORE UPDATE ON public.flora_scheduled_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_flora_scheduled_tasks_updated_at();