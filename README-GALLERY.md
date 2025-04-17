# Setting Up the Gallery Feature

This guide explains how to set up the gallery feature in the Ghibli app.

## Database Setup

The gallery feature requires a Supabase database table and storage bucket. Follow these steps to set up the required infrastructure:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script in `setup-gallery.sql`

This script will:
- Create the `gallery` table to store image metadata
- Set up Row Level Security (RLS) policies for the table
- Create a `gallery` storage bucket for the images
- Set up storage policies for the bucket

## How the Gallery Feature Works

The gallery feature allows users to:

1. Download generated images to their device
2. Save generated images to their personal gallery

When a user saves an image to the gallery:
1. The image is uploaded to the Supabase storage bucket
2. A record is created in the `gallery` table with metadata about the image
3. The image can then be viewed in the gallery page

## Fallback Mechanism

If the `gallery` bucket doesn't exist, the app will try to use other buckets in this order:
1. `gallery` (primary)
2. `images` (fallback 1)
3. `avatars` (fallback 2)

This ensures that users can still save images even if the gallery bucket hasn't been set up yet.

## Troubleshooting

If you encounter issues with the gallery feature:

1. Check that the `gallery` table exists in your Supabase database
2. Check that the `gallery` storage bucket exists
3. Verify that the RLS policies are set up correctly
4. Check the browser console for any error messages

If you see the error "Bucket not found", run the `setup-gallery.sql` script in your Supabase SQL Editor to create the necessary tables and buckets.
