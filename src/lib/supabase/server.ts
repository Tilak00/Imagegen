'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Import CookieOptions
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies(); // Await the cookies() promise

  // Remove quotes if they exist in the environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^['"]+|['"]+$/g, '') || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/^['"]+|['"]+$/g, '') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...');
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
