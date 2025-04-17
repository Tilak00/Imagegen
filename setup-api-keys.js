// setup-api-keys.js
// This script inserts the Gemini API key into Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or anon key is missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get Gemini API key from command line argument
const geminiApiKey = process.argv[2];
if (!geminiApiKey) {
  console.error('Please provide the Gemini API key as a command line argument');
  console.error('Usage: node setup-api-keys.js YOUR_GEMINI_API_KEY');
  process.exit(1);
}

async function setupApiKeys() {
  try {
    // First, let's try to insert the API key directly
    // If the table doesn't exist, this will fail
    console.log('Attempting to insert Gemini API key...');
    const { error: insertError } = await supabase
      .from('api_keys')
      .upsert([{ name: 'gemini', key: geminiApiKey }], { onConflict: 'name' });

    if (insertError) {
      console.error('Error inserting API key:', insertError);

      // If the error is that the table doesn't exist, let's create it
      if (insertError.message.includes('relation "api_keys" does not exist')) {
        console.log('The api_keys table does not exist. You need to create it in the Supabase dashboard.');
        console.log('Please follow these steps:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to the SQL Editor');
        console.log('3. Run the following SQL:');
        console.log(`
          CREATE TABLE public.api_keys (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            key TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Insert the Gemini API key
          INSERT INTO public.api_keys (name, key)
          VALUES ('gemini', '${geminiApiKey}')
          ON CONFLICT (name) DO UPDATE SET key = EXCLUDED.key;

          -- Set up row level security
          ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

          -- Create policy to allow authenticated users to read keys
          CREATE POLICY "Allow authenticated users to read keys"
          ON public.api_keys
          FOR SELECT
          TO authenticated
          USING (true);
        `);
        return;
      }
      return;
    }

    console.log('API key setup complete!');
    console.log('You can now use the Gemini API for image generation.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupApiKeys();
