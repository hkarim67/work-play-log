-- Create time_entries table to store stopwatch sessions
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('leisure', 'business', 'jobs')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a personal tracking app)
CREATE POLICY "Allow all operations on time_entries" 
ON public.time_entries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster date-based queries
CREATE INDEX idx_time_entries_date ON public.time_entries(date);
CREATE INDEX idx_time_entries_category ON public.time_entries(category);