-- Create chat_histories table
CREATE TABLE IF NOT EXISTS public.chat_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  preview TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS (Row Level Security) for the chat_histories table
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their own chat histories
CREATE POLICY "Users can view their own chat histories"
ON public.chat_histories
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own chat histories
CREATE POLICY "Users can insert their own chat histories"
ON public.chat_histories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own chat histories
CREATE POLICY "Users can update their own chat histories"
ON public.chat_histories
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own chat histories
CREATE POLICY "Users can delete their own chat histories"
ON public.chat_histories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS chat_histories_user_id_idx ON public.chat_histories(user_id);
