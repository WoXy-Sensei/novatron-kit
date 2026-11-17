import type { NovatronAuthAction } from '#novatron/types/novatron'

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ action?: unknown }>(event)) ?? {}
  if (body.action !== 'auth.login' && body.action !== 'auth.logout') {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported auth action' })
  }
  const action: NovatronAuthAction = body.action

  // Logout is still recorded for members whose role was revoked mid-session.
  if (action === 'auth.login') {
    await requireAppAccess(event)
  }

  try {
    return await hqFetch<{ ok: boolean }>(event, '/audit/events', {
      method: 'POST',
      body: { app: String(useRuntimeConfig(event).public.appId), action, client: forwardedClient(event) },
    })
  } catch (error) {
    console.warn('[novatron] auth event forwarding failed:', (error as Error).message)
    return { ok: false }
  }
})
