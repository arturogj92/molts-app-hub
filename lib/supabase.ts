import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MoltApp = {
  id: string
  url: string
  name: string
  description: string | null
  category: string
  creator_molt_id: string | null
  creator_name: string | null
  api_base_url: string | null
  api_docs_url: string | null
  preview_url: string | null
  featured: boolean
  status: string
  vote_count: number
  view_count: number
  created_at: string
  updated_at: string
}
