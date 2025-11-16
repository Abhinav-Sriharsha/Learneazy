-- Supabase Users Table for Quota Tracking
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  photo_url TEXT,
  queries_used INTEGER DEFAULT 0,
  pdfs_uploaded INTEGER DEFAULT 0,
  has_own_keys BOOLEAN DEFAULT false,
  max_queries INTEGER DEFAULT 5,
  max_pdfs INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid()::text = google_id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid()::text = google_id);

-- Allow insert for new users (backend will handle this)
CREATE POLICY "Allow insert for authenticated users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Users table created successfully!';
  RAISE NOTICE 'Free tier limits: 5 queries, 1 PDF upload per user';
END $$;
