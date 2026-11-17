import type { H3Event } from 'h3'
import { getRequestHeader, getRequestIP } from 'h3'
import { serverSupabaseSession } from '#supabase/server'
import { ofetch } from 'ofetch'

const HQ_TIMEOUT_MS = 5000

export interface HqRequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  body?: Record<string, unknown>
  query?: Record<string, string>
}

/** The member's IP/UA as seen by this app, forwarded so HQ audit logs show the real client. */
export function forwardedClient(event: H3Event) {
  return {
    ip_address: getRequestIP(event, { xForwardedFor: true }) ?? null,
    user_agent: getRequestHeader(event, 'user-agent')?.slice(0, 255) ?? null,
  }
}

/** Calls HQ REST API v1 on behalf of the signed-in member (their access token as Bearer). */
export async function hqFetch<T>(event: H3Event, path: string, options: HqRequestOptions = {}): Promise<T> {
  const session = await serverSupabaseSession(event).catch(() => null)
  if (!session?.access_token) {
    throw createError({ statusCode: 401, statusMessage: useAppConfig().novatron.messages.authRequired })
  }

  // Plain ofetch: HQ is an external service, not one of this app's typed Nitro routes.
  return await ofetch<T>(path, {
    baseURL: String(useRuntimeConfig(event).hqApiUrl),
    method: options.method ?? 'GET',
    body: options.body,
    query: options.query,
    headers: { Authorization: `Bearer ${session.access_token}` },
    timeout: HQ_TIMEOUT_MS,
  })
}
