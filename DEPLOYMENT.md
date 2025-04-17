# Deployment Guide for Ghibli AI Generator

This guide provides instructions for deploying the Ghibli AI Generator application to production.

## Prerequisites

- A GitHub account with your project repository
- A Supabase account
- A Gemini API key
- A Vercel account (recommended) or another hosting provider

## 1. Prepare Your Supabase Project

### Create a Production Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in
2. Create a new project for production
3. Note down the project URL and anon key

### Set Up Database Tables

Run the following SQL scripts in the Supabase SQL editor:

1. Run the chat history setup script:
```sql
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
```

2. Create the user_profiles table:
```sql
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  credits_remaining INTEGER DEFAULT 3,
  subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- Set up RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
```

3. Create the api_keys table:
```sql
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your Gemini API key
INSERT INTO public.api_keys (name, key)
VALUES ('gemini', 'your_gemini_api_key')
ON CONFLICT (name) DO UPDATE SET key = EXCLUDED.key;
```

### Configure Authentication

1. Go to Authentication → Settings
2. Configure the Site URL to match your production URL
3. Set up any OAuth providers you want to use (Google, GitHub, etc.)

## 2. Deploy to Vercel (Recommended)

### Connect Your Repository

1. Go to [Vercel](https://vercel.com/) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `ghibli-app/ghibli-next-app` (if your project is in a subdirectory)

### Configure Environment Variables

Add the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your production Supabase anon key
- `GEMINI_API_KEY`: Your Gemini API key (optional if stored in Supabase)

### Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at the provided Vercel URL

### Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain and follow the instructions

## 3. Alternative Deployment Options

### Self-hosting with Node.js

1. Build your application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

### Docker Deployment

1. Create a Dockerfile:
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

2. Build and run the Docker container:
```bash
docker build -t ghibli-app .
docker run -p 3000:3000 ghibli-app
```

## 4. Post-Deployment Steps

### Verify Functionality

1. Test user authentication
2. Test image generation
3. Verify credit system works
4. Check chat history functionality

### Monitor Performance

1. Set up monitoring tools (Vercel Analytics, Google Analytics, etc.)
2. Monitor Supabase usage and performance

### Backup Strategy

1. Set up regular database backups in Supabase
2. Consider implementing a backup solution for generated images

## Troubleshooting

### Common Issues

1. **Environment Variables Not Working**
   - Verify they are correctly set in your deployment platform
   - Check for typos in variable names

2. **Authentication Issues**
   - Ensure Site URL is correctly set in Supabase
   - Check for CORS issues

3. **API Errors**
   - Verify API keys are correctly set
   - Check API rate limits

For additional help, refer to:
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
