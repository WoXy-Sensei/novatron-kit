/** Claims contract v1 written by HQ's custom access token hook into `app_metadata`. */
export interface NovatronJwtMetadata {
  is_active?: boolean
  app_roles?: Record<string, string[] | string>
  app_permissions?: Record<string, string[]>
  username?: string | null
  full_name?: string | null
  /** True until the member replaces their temporary password (HQ clears it on `POST /api/v1/me/password`). */
  must_change_password?: boolean
}

/** Manifest contract v1 (`novatron.app.json`), applied through `PUT /api/v1/apps/{app_key}/manifest`. */
export interface NovatronAppManifest {
  manifest_version: 1
  app_key: string
  name: string
  description?: string
  url?: string | null
  lead_role?: string | null
  permissions: Array<{ key: string; display_name: string; description?: string }>
  roles: Array<{ key: string; display_name: string; description?: string; permissions: string[] }>
}

export interface NovatronAccess {
  userId: string
  username: string | null
  fullName: string | null
  roles: string[]
  permissions: string[]
  can: (permission: string) => boolean
}

export type NovatronAuthAction = 'auth.login' | 'auth.logout'
