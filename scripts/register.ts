#!/usr/bin/env bun
/**
 * Registers (or updates) this app in HQ from ./novatron.app.json via PUT /api/v1/apps/{app_key}/manifest.
 *
 * Signs in as an HQ super_admin through the regular Supabase Auth flow; nothing is stored.
 *   NOVATRON_HQ_URL           HQ base URL (default https://hq.novatronrobotics.com)
 *   NOVATRON_ADMIN_USERNAME   optional, otherwise prompted
 *   NOVATRON_ADMIN_PASSWORD   optional, otherwise prompted without echo
 *
 * Usage: bun run hq:register [--manifest path/to/novatron.app.json]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

interface Discovery {
  api_version: number
  manifest_version: number
  auth: { url: string; publishable_key: string; synthetic_email_domain: string }
}

function fail(message: string): never {
  console.error(`error: ${message}`)
  process.exit(1)
}

function readManifest(): { app_key: string } & Record<string, unknown> {
  const flagIndex = process.argv.indexOf('--manifest')
  const path = resolve(flagIndex > -1 ? (process.argv[flagIndex + 1] ?? '') : 'novatron.app.json')
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8'))
    if (typeof manifest?.app_key !== 'string') fail(`${path} has no app_key`)
    return manifest
  } catch (error) {
    fail(`cannot read manifest ${path}: ${(error as Error).message}`)
  }
}

async function readHidden(label: string): Promise<string> {
  process.stdout.write(label)
  const stdin = process.stdin
  if (!stdin.isTTY) {
    return (prompt('') ?? '').trim()
  }

  stdin.setRawMode(true)
  stdin.resume()
  let value = ''
  return await new Promise((done) => {
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stdout.write('\n')
          done(value)
          return
        }
        if (char === '\u0003') process.exit(130)
        value = char === '\u007f' ? value.slice(0, -1) : value + char
      }
    }
    stdin.on('data', onData)
  })
}

async function main(): Promise<void> {
  const manifest = readManifest()
  const hqUrl = (process.env.NOVATRON_HQ_URL || 'https://hq.novatronrobotics.com').replace(/\/$/, '')

  const discoveryResponse = await fetch(`${hqUrl}/api/v1/discovery`)
  if (!discoveryResponse.ok) fail(`HQ discovery failed (${discoveryResponse.status}) at ${hqUrl}`)
  const discovery = (await discoveryResponse.json()) as Discovery
  if (discovery.manifest_version !== manifest.manifest_version) {
    fail(`HQ expects manifest_version ${discovery.manifest_version}, manifest has ${String(manifest.manifest_version)}`)
  }

  const username = (process.env.NOVATRON_ADMIN_USERNAME || prompt('HQ super_admin username:') || '').trim().toLowerCase()
  const password = process.env.NOVATRON_ADMIN_PASSWORD || (await readHidden('Password: '))
  if (!username || !password) fail('username and password are required')

  const auth = createClient(discovery.auth.url, discovery.auth.publishable_key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const email = username.includes('@') ? username : `${username}@${discovery.auth.synthetic_email_domain}`
  const { data, error } = await auth.auth.signInWithPassword({ email, password })
  if (error || !data.session) fail(`sign-in failed: ${error?.message ?? 'no session'}`)

  try {
    const response = await fetch(`${hqUrl}/api/v1/apps/${encodeURIComponent(manifest.app_key)}/manifest`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(manifest),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) fail(`HQ rejected the manifest (${response.status}): ${result.statusMessage ?? response.statusText}`)
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await auth.auth.signOut()
  }
}

await main()
