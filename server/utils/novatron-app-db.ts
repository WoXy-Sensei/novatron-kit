import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let cached: { url: string; client: SupabaseClient } | null = null

/**
 * Server-only client for this app's own data store (APP_SUPABASE_URL / APP_SUPABASE_SECRET_KEY).
 * It bypasses RLS, so call it only after requireAppAccess() and scope every query to the verified user.
 */
export function useAppDb<Database = any>(event: H3Event): SupabaseClient<Database> {
  const config = useRuntimeConfig(event)
  const url = String(config.appSupabaseUrl || '')
  const secretKey = String(config.appSupabaseSecretKey || '')

  if (!url || !secretKey) {
    console.error('[novatron] APP_SUPABASE_URL / APP_SUPABASE_SECRET_KEY are not configured')
    throw createError({ statusCode: 500, statusMessage: 'Application database is not configured' })
  }

  if (cached?.url !== url) {
    cached = {
      url,
      client: createClient(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    }
  }

  return cached.client as unknown as SupabaseClient<Database>
}
