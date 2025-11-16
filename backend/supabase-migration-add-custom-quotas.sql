-- Migration: Add custom quota columns to existing users table
-- Run this in Supabase SQL Editor if you already have the users table

-- Add max_queries column (default 5)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS max_queries INTEGER DEFAULT 5;

-- Add max_pdfs column (default 1)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS max_pdfs INTEGER DEFAULT 1;

-- Update all existing users to have default quota limits
UPDATE public.users
SET max_queries = 5, max_pdfs = 1
WHERE max_queries IS NULL OR max_pdfs IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Custom quota columns added successfully!';
  RAISE NOTICE 'All users now have max_queries=5 and max_pdfs=1 by default';
  RAISE NOTICE 'Admins can now customize these values per user';
END $$;
