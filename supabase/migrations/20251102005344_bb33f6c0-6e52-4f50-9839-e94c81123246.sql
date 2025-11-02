-- Remove the restrictive category check constraint on time_entries
-- This allows dynamic timer categories instead of only 'leisure', 'business', 'jobs'
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_category_check;

-- Add a more permissive check to ensure category is not empty
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_category_not_empty CHECK (length(category) > 0);