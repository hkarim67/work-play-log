-- Create timers table
CREATE TABLE public.timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timers ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since this is a simple app without auth)
CREATE POLICY "Allow all operations on timers"
ON public.timers
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default timers
INSERT INTO public.timers (name, category, sort_order) VALUES
  ('Leisure', 'leisure', 1),
  ('Business', 'business', 2),
  ('Jobs', 'jobs', 3);