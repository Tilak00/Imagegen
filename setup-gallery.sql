-- Create the gallery table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS (Row Level Security) for the gallery table
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own gallery items
CREATE POLICY "Users can insert their own gallery items"
ON public.gallery
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to select their own gallery items
CREATE POLICY "Users can view their own gallery items"
ON public.gallery
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow users to update their own gallery items
CREATE POLICY "Users can update their own gallery items"
ON public.gallery
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own gallery items
CREATE POLICY "Users can delete their own gallery items"
ON public.gallery
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for gallery images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the gallery bucket
CREATE POLICY "Public read access for gallery images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own gallery images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own gallery images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
