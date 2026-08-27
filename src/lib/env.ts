const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref'),
)

export const env = {
  supabaseUrl: supabaseUrl ?? '',
  supabaseAnonKey: supabaseAnonKey ?? '',
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'FamilyHub',
  defaultCurrency: (import.meta.env.VITE_DEFAULT_CURRENCY as string | undefined) ?? 'EUR',
  defaultLocale: (import.meta.env.VITE_DEFAULT_LOCALE as string | undefined) ?? 'de-DE',
}
