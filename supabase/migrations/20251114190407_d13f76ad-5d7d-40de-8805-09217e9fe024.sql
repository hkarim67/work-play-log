-- Add estimated_minutes column to dumped tasks
ALTER TABLE public.flora_dumped_tasks 
ADD COLUMN estimated_minutes INTEGER;

-- Add update policy for dumped tasks
CREATE POLICY "Users can update their own dumped tasks" 
ON public.flora_dumped_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);