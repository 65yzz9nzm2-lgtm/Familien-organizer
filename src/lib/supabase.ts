import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env, isSupabaseConfigured } from '@/lib/env'

// When Supabase isn't configured yet (no .env.local), we still create a client
// pointed at a placeholder URL so the rest of the app can import it without
// crashing at module-load time. All requests will simply fail until the real
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set - see .env.example.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? env.supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
