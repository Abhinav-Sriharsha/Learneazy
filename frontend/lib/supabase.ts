import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// User interface for our app
export interface User {
  id: string
  google_id: string
  email: string
  name: string | null
  photo_url: string | null
  queries_used: number
  pdfs_uploaded: number
  has_own_keys: boolean
  max_queries: number
  max_pdfs: number
  created_at: string
  updated_at: string
}

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_QUERIES: 5,
  MAX_PDF_UPLOADS: 1,
}
