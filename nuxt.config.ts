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

  // Shared brand icons live in kit/public and are merged into every extending app (an app overrides by shipping the same file names).
  app: {
    head: {
      meta: [{ name: 'theme-color', content: '#050505' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', sizes: '32x32', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
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

  // Password changes verify the current password, so they get a strict budget against guessing.
  routeRules: {
    '/api/_novatron/password': {
      security: { rateLimiter: { tokensPerInterval: 10, interval: 900000, headers: true } },
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
