-- Add timeframe enum for categories
CREATE TYPE public.category_timeframe AS ENUM ('short_term', 'medium_term', 'long_term');

-- Add timeframe and due_date to objective_categories
ALTER TABLE public.objective_categories
ADD COLUMN timeframe category_timeframe,
ADD COLUMN due_date DATE;

-- Update existing lifetime category to have no timeframe (it's special)
-- Regular categories will require timeframe going forward