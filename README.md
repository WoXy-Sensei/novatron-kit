# @novatron/kit

Shared Nuxt layer for Novatron Robotics (FRC 10202) team apps. It connects an app to HQ (identity, roles, presence, audit) and to the app's own Supabase data store.

## What the layer provides

| Area | Contents |
| :--- | :--- |
| Pages | `/login` (username + password against HQ Supabase Auth), `/unauthorized` |
| Client | `novatron-auth.global.ts` route guard, presence heartbeat plugin, `useAppAccess()`, `useSignOut()` |
| Server | `requireAppAccess(event, { permission })`, `useAppDb<Database>(event)`, `hqFetch(event, path)` |
| Routes | `POST /api/_novatron/heartbeat`, `POST /api/_novatron/auth-event` (forwarded to HQ API v1) |
| Shared | `NovatronJwtMetadata`, `NovatronAppManifest`, `resolveAccess()`, `normalizeRoles()` |
| CLI | `novatron-db push|status` (per-repo migration history), `novatron-register` (applies `novatron.app.json` to HQ) |
| Styles | Astryx base, `novatron.css` tokens, sign-in card styles |

User-facing copy lives in `app/app.config.ts` under `novatron.messages` and can be overridden per app.

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@novatron/kit'],
  runtimeConfig: { public: { appId: 'my_app' } },
  supabase: { types: '~/types/database.types.ts' },
})
```

```jsonc
// package.json
"dependencies": { "@novatron/kit": "github:WoXy-Sensei/novatron-kit#v1.0.0" },
"scripts": {
  "db:push": "novatron-db push",
  "db:status": "novatron-db status",
  "hq:register": "novatron-register"
}
```

For live development against a sibling checkout, make the app's `extends` overridable and set the path in the app's local `.env` (never use `bun link`, it rewrites `bun.lock`):

```ts
extends: [process.env.NOVATRON_KIT_PATH || '@novatron/kit'],
```

```env
NOVATRON_KIT_PATH=../kit
```

The `novatron-db` and `novatron-register` binaries always run from the pinned package.

## Releasing

```bash
git tag vX.Y.Z && git push origin main vX.Y.Z
```

Apps upgrade with `bun add github:WoXy-Sensei/novatron-kit#vX.Y.Z` and commit `package.json` with `bun.lock`.

## Environment

| Variable | Scope | Purpose |
| :--- | :--- | :--- |
| `NOVATRON_AUTH_URL`, `NOVATRON_AUTH_PUBLISHABLE_KEY` | public | HQ Supabase project (identity) |
| `NOVATRON_HQ_URL` | public | HQ base URL; API v1 lives under `/api/v1` |
| `NOVATRON_COOKIE_DOMAIN` | build | e.g. `.novatronrobotics.com` for one sign-in across subdomains; unset locally |
| `APP_SUPABASE_URL`, `APP_SUPABASE_SECRET_KEY` | server | The app's own data store; same values as HQ in shared-database mode |
| `NUXT_PUBLIC_APP_ID`, `NUXT_PUBLIC_SITE_URL` | public | App key and public URL |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server | Optional distributed rate limiting |

## Data access model

The browser only talks to HQ Supabase Auth and to the app's own `/api`. App tables are deny-all for `anon` and `authenticated`; server routes call `requireAppAccess()` and then `useAppDb()`, scoping every query to the verified user. This makes "same database as HQ" and "separate database" a configuration change only.
