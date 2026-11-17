import { createResolver } from '@nuxt/kit'

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

// Identity always comes from the HQ Supabase project; legacy SUPABASE_* names are accepted as fallbacks.
const authUrl = (env.NOVATRON_AUTH_URL || env.SUPABASE_URL || '').replace(/\/$/, '')
const authPublishableKey = env.NOVATRON_AUTH_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || ''
const hqUrl = (env.NOVATRON_HQ_URL || 'https://hq.novatronrobotics.com').replace(/\/$/, '')
const cookieDomain = env.NOVATRON_COOKIE_DOMAIN || ''

const upstashReady = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)

const { resolve: resolveLocal } = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase', 'nuxt-security'],

  // Stable import path for the kit's shared contracts from both the layer and consuming apps.
  alias: {
    '#novatron': resolveLocal('./shared'),
  },

  css: [
    '@astryxdesign-vue/core/style.css',
    resolveLocal('./app/assets/css/novatron.css'),
    resolveLocal('./app/assets/css/novatron-auth.css'),
  ],

  runtimeConfig: {
    // Server-only. The app's own data store: the HQ project in shared-database mode, or a separate project.
    appSupabaseUrl: env.APP_SUPABASE_URL || authUrl,
    appSupabaseSecretKey: env.APP_SUPABASE_SECRET_KEY || '',
    hqApiUrl: env.NOVATRON_HQ_API_URL || `${hqUrl}/api/v1`,
    public: {
      appId: env.NUXT_PUBLIC_APP_ID || '',
      siteUrl: env.NUXT_PUBLIC_SITE_URL || '',
      hqUrl,
      syntheticEmailDomain: 'auth.novatron10202.internal',
    },
  },

  supabase: {
    // Apps point this at their own generated types file.
    types: false,
    ...(authUrl ? { url: authUrl } : {}),
    ...(authPublishableKey ? { key: authPublishableKey } : {}),
    ...(cookieDomain ? { cookieOptions: { domain: cookieDomain, sameSite: 'lax' as const, secure: true } } : {}),
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/unauthorized'],
    },
  },

  security: {
    rateLimiter: {
      tokensPerInterval: 120,
      interval: 300000,
      headers: true,
      // The unstorage Upstash driver reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN itself.
      driver: upstashReady ? { name: 'upstash' } : { name: 'lruCache' },
    },
  },

  typescript: {
    strict: true,
  },
})
