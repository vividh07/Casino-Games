import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const forceDemo = import.meta.env.VITE_DEMO_MODE === 'true'

export const isDemoMode = forceDemo || !url || !anon || url.includes('your-project')

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anon!)
