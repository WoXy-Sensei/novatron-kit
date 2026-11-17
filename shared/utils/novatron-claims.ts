import type { NovatronAccess, NovatronJwtMetadata } from '../types/novatron'

export function normalizeRoles(raw: string[] | string | null | undefined): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  return Array.from(
    new Set(list.map((role) => role.trim().toLowerCase()).filter((role) => role.length > 0 && role !== 'none')),
  )
}

/** An active HQ super_admin implicitly has full access to every team app. */
export function isHqSuperAdmin(metadata: NovatronJwtMetadata | null | undefined): boolean {
  return metadata?.is_active === true && normalizeRoles(metadata.app_roles?.hq).includes('super_admin')
}

/** Resolves a member's access to one app from verified claims; `null` means no access at all. */
export function resolveAccess(
  userId: string | null | undefined,
  metadata: NovatronJwtMetadata | null | undefined,
  appId: string,
): NovatronAccess | null {
  if (!userId || metadata?.is_active !== true) {
    return null
  }

  const superAdmin = isHqSuperAdmin(metadata)
  const roles = Array.from(new Set([...normalizeRoles(metadata.app_roles?.[appId]), ...(superAdmin ? ['super_admin'] : [])]))
  if (roles.length === 0) {
    return null
  }

  const permissions = superAdmin ? ['*'] : (metadata.app_permissions?.[appId] ?? [])
  return {
    userId,
    username: metadata.username ?? null,
    fullName: metadata.full_name ?? null,
    roles,
    permissions,
    can: (permission) => permissions.includes('*') || permissions.includes(permission),
  }
}
