-- Create enum for objective status
CREATE TYPE public.objective_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Create table for objective categories
CREATE TABLE public.objective_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_lifetime BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for objectives
CREATE TABLE public.objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.objective_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status objective_status NOT NULL DEFAULT 'not_started',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.objective_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for objective_categories
CREATE POLICY "Users can view their own categories"
  ON public.objective_categories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON public.objective_categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.objective_categories
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.objective_categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for objectives
CREATE POLICY "Users can view their own objectives"
  ON public.objectives
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own objectives"
  ON public.objectives
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own objectives"
  ON public.objectives
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own objectives"
  ON public.objectives
  FOR DELETE
  USING (auth.uid() = user_id);