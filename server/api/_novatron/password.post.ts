import { serverSupabaseUser } from '#supabase/server'

/** Relays a self-service password change to HQ. No requireAppAccess: a member whose flag is set must be able to call it. */
export default defineEventHandler(async (event) => {
  const text = useAppConfig().novatron.messages
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user?.sub) {
    throw createError({ statusCode: 401, statusMessage: text.authRequired })
  }

  const body = (await readBody<{ current_password?: unknown; new_password?: unknown }>(event)) ?? {}
  if (typeof body.current_password !== 'string' || typeof body.new_password !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'current_password and new_password are required' })
  }

  try {
    return await hqFetch<{ ok: boolean }>(event, '/me/password', {
      method: 'POST',
      body: { current_password: body.current_password, new_password: body.new_password },
    })
  } catch (error) {
    // Unlike presence, a failed password change must surface HQ's 4xx outcome to the member.
    const failure = error as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string; message?: string } }
    const status = failure.statusCode ?? 0
    if (status >= 400 && status < 500) {
      throw createError({
        statusCode: status,
        statusMessage: failure.data?.statusMessage || failure.data?.message || failure.statusMessage || 'Password change rejected',
      })
    }
    console.warn('[novatron] password change forwarding failed:', (error as Error).message)
    throw createError({ statusCode: 502, statusMessage: 'HQ is unavailable' })
  }
})
