import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import type { NovatronAccess, NovatronJwtMetadata } from '#novatron/types/novatron'

export interface AppAccessOptions {
  permission?: string
  allowedRoles?: string[]
  /** Skip the first-login password gate. Only for handlers that must work before the password is changed. */
  allowPasswordChangePending?: boolean
}

/** Verifies the HQ-issued JWT (JWKS via @nuxtjs/supabase) and this app's role/permission claims. */
export async function requireAppAccess(event: H3Event, options: AppAccessOptions = {}): Promise<NovatronAccess> {
  const text = useAppConfig().novatron.messages
  const appId = String(useRuntimeConfig(event).public.appId)
  const claims = await serverSupabaseUser(event).catch(() => null)

  if (!claims?.sub) {
    throw createError({ statusCode: 401, statusMessage: text.authRequired })
  }

  const metadata = (claims.app_metadata ?? {}) as NovatronJwtMetadata
  if (metadata.must_change_password === true && !options.allowPasswordChangePending) {
    throw createError({ statusCode: 403, statusMessage: text.passwordChangeRequired })
  }

  const access = resolveAccess(claims.sub, metadata, appId)
  if (!access) {
    throw createError({ statusCode: 403, statusMessage: text.accessDenied })
  }

  if (options.allowedRoles && !options.allowedRoles.some((role) => access.roles.includes(role.toLowerCase()))) {
    throw createError({ statusCode: 403, statusMessage: text.roleDenied })
  }

  if (options.permission && !access.can(options.permission)) {
    throw createError({ statusCode: 403, statusMessage: text.permissionDenied })
  }

  return access
}
