-- Add folder column to flora_lists for master folder grouping
ALTER TABLE public.flora_lists 
ADD COLUMN folder text NOT NULL DEFAULT 'Health';

-- Add a check constraint for valid folder values
ALTER TABLE public.flora_lists 
ADD CONSTRAINT flora_lists_folder_check 
CHECK (folder IN ('Love', 'Leisure', 'Money', 'Health'));