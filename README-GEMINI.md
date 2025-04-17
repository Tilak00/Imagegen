# Setting Up Gemini API for Image Generation

This guide explains how to set up the Gemini API key for image generation in the Ghibli app.

## Dependencies

This application uses the official Google Generative AI JavaScript SDK. It should already be installed, but if you need to install it manually, run:

```bash
npm install @google/genai
```

## Important: About the Gemini Model

This application uses the `gemini-2.0-flash-exp-image-generation` model for image generation through the official Google Generative AI JavaScript SDK. This model supports text-to-image generation capabilities.

**Important Note**: This model requires both TEXT and IMAGE in the responseModalities parameter. Image-only output is not allowed. Our implementation already handles this requirement.

## Option 1: Add to Environment Variables (Recommended)

1. Get your Gemini API key from the [Google AI Studio](https://ai.google.dev/).
2. Add the key to your `.env.local` file:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Restart your Next.js development server.

## Option 2: Store in Supabase

If you prefer to store your API key in Supabase:

### Create the API Keys Table

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following SQL:

```sql
CREATE TABLE public.api_keys (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the Gemini API key
INSERT INTO public.api_keys (name, key)
VALUES ('gemini', 'your_gemini_api_key_here')
ON CONFLICT (name) DO UPDATE SET key = EXCLUDED.key;

-- Set up row level security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read keys
CREATE POLICY "Allow authenticated users to read keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (true);
```

### Using the Setup Script

Alternatively, you can use the provided setup script:

1. Install the required dependencies:

```bash
npm install dotenv @supabase/supabase-js
```

2. Run the setup script with your Gemini API key:

```bash
node setup-api-keys.js YOUR_GEMINI_API_KEY
```

The script will attempt to insert the key into the `api_keys` table. If the table doesn't exist, it will provide the SQL commands you need to run in the Supabase dashboard.

## Testing the Integration

Once you've set up your Gemini API key, you can test the image generation feature:

1. Enter a prompt in the input box
2. Click the enhance button to improve the prompt (optional)
3. Click send to generate an image using Gemini

The app will call the Gemini API to generate an image based on your prompt.

## Troubleshooting

### API Key Issues

If you encounter the error "Failed to retrieve API key", check that:

1. Your Gemini API key is correctly set in either the environment variables or Supabase
2. If using Supabase, make sure the `api_keys` table exists and has a row with `name='gemini'`
3. Check the browser console and server logs for more detailed error messages

### Next.js Compatibility Issues

If you encounter errors related to "GoogleGenerativeAI is not a constructor" or other webpack-related issues:

1. Make sure you're using a compatible version of Next.js
2. Try restarting the development server
3. Our implementation now uses a server action approach which is more compatible with Next.js
4. You'll see "[Using Gemini API]" in the response text when the Gemini API is used
5. If the Gemini API fails, the app will automatically fall back to using placeholder images
6. You'll see "[Using Placeholder]" in the response text when the placeholder is used
7. This allows you to test the enhance prompt feature even if the Gemini API is unavailable

### Model Access Issues

If you encounter errors related to model access:

1. Make sure your Gemini API key has access to the `gemini-2.0-flash-exp-image-generation` model
2. Check if there are any quota limitations on your Gemini API account
3. Verify that the model is available in your region
