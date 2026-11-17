export default defineEventHandler(async (event) => {
  await requireAppAccess(event)
  const body = (await readBody<{ path?: unknown }>(event)) ?? {}
  const path = typeof body.path === 'string' && body.path.startsWith('/') ? body.path.slice(0, 255) : '/'

  try {
    return await hqFetch<{ ok: boolean }>(event, '/presence/heartbeat', {
      method: 'POST',
      body: { app: String(useRuntimeConfig(event).public.appId), path, client: forwardedClient(event) },
    })
  } catch (error) {
    // Presence is best effort; an HQ outage must not break the app.
    console.warn('[novatron] heartbeat forwarding failed:', (error as Error).message)
    return { ok: false }
  }
})
