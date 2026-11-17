import type { NovatronJwtMetadata } from '#novatron/types/novatron'

/** Client-side view of the member's access to this app. UI hints only; the server re-checks every request. */
export function useAppAccess() {
  const user = useSupabaseUser()
  const appId = String(useRuntimeConfig().public.appId)

  const userId = computed(() => {
    const claims = user.value as { sub?: string; id?: string } | null
    return claims?.sub ?? claims?.id ?? null
  })
  const metadata = computed(() => (user.value?.app_metadata ?? {}) as NovatronJwtMetadata)
  const access = computed(() => resolveAccess(userId.value, metadata.value, appId))

  const roles = computed(() => access.value?.roles ?? [])
  const permissions = computed(() => access.value?.permissions ?? [])

  function can(permission: string): boolean {
    return access.value?.can(permission) ?? false
  }

  return { userId, metadata, access, roles, permissions, can }
}
