import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in Client Components.
 * This client interacts with Supabase using standard browser features
 * (window.localStorage, fetching) but configured via SSR utilities.
 * 
 * @returns {SupabaseClient} An initialized browser-safe Supabase client
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}