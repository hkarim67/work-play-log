-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Create trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to timers table
ALTER TABLE public.timers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Delete existing timers (users will need to recreate them)
DELETE FROM public.timers;

-- Make user_id required for new entries
ALTER TABLE public.timers ALTER COLUMN user_id SET NOT NULL;

-- Update timers RLS policies
DROP POLICY IF EXISTS "Allow all operations on timers" ON public.timers;

CREATE POLICY "Users can view their own timers"
ON public.timers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timers"
ON public.timers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers"
ON public.timers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timers"
ON public.timers
FOR DELETE
USING (auth.uid() = user_id);

-- Add user_id to time_entries table
ALTER TABLE public.time_entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Delete existing entries (will start fresh with user-specific data)
DELETE FROM public.time_entries;

-- Make user_id required for new entries
ALTER TABLE public.time_entries ALTER COLUMN user_id SET NOT NULL;

-- Update time_entries RLS policies
DROP POLICY IF EXISTS "Allow all operations on time_entries" ON public.time_entries;

CREATE POLICY "Users can view their own entries"
ON public.time_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries"
ON public.time_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
ON public.time_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
ON public.time_entries
FOR DELETE
USING (auth.uid() = user_id);