#!/usr/bin/env bun
/**
 * Per-project migration wrapper for the shared Novatron Supabase database.
 *
 * The Supabase CLI keeps ONE migration history table per database. When several independent repos
 * push to the same database, the CLI refuses to continue because the other repos' versions are
 * "not found in the local migrations directory".
 *
 * This wrapper keeps every repo self-contained: it reads the remote history, and for versions that
 * belong to other projects it generates empty placeholder files in a throw-away staging directory
 * (never in the repo). The stock `supabase db push` then runs against the staging copy and applies
 * only this repo's pending migrations. The same script works against any linked Supabase project.
 *
 * Usage:
 *   bun run scripts/db.ts push [--dry-run]   apply this repo's pending migrations
 *   bun run scripts/db.ts status             show applied / pending / other-project versions
 *
 * Set SUPABASE_BIN to override the CLI command (default: "bunx supabase").
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const VERSION_PATTERN = /^\d{14}$/
const FILE_PATTERN = /^(\d{14})_[a-z0-9_]+\.sql$/

export interface MigrationListing {
  local: Set<string>
  remote: Set<string>
}

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g

function parseJsonListing(output: string): MigrationListing | null {
  const start = output.indexOf('{')
  if (start === -1) {
    return null
  }
  try {
    const parsed = JSON.parse(output.slice(start)) as { migrations?: Array<{ local?: string; remote?: string }> }
    if (!Array.isArray(parsed.migrations)) {
      return null
    }
    const local = new Set<string>()
    const remote = new Set<string>()
    for (const row of parsed.migrations) {
      if (VERSION_PATTERN.test(row.local ?? '')) local.add(row.local!)
      if (VERSION_PATTERN.test(row.remote ?? '')) remote.add(row.remote!)
    }
    return { local, remote }
  } catch {
    return null
  }
}

// Newer Supabase CLI releases print JSON; older ones print a table.
export function parseMigrationList(output: string): MigrationListing {
  const fromJson = parseJsonListing(output)
  if (fromJson) {
    return fromJson
  }

  const local = new Set<string>()
  const remote = new Set<string>()
  // Column positions come from the header row, so outer table borders cannot shift them.
  let localIndex = 0
  let remoteIndex = 1

  for (const line of output.replace(ANSI_PATTERN, '').split('\n')) {
    const cells = line.trim().split(/[│|]/).map((cell) => cell.replace(/`/g, '').trim())
    if (cells.length < 2) {
      continue
    }

    const lowered = cells.map((cell) => cell.toLowerCase())
    if (lowered.includes('local') && lowered.includes('remote')) {
      localIndex = lowered.indexOf('local')
      remoteIndex = lowered.indexOf('remote')
      continue
    }

    if (VERSION_PATTERN.test(cells[localIndex] ?? '')) {
      local.add(cells[localIndex]!)
    }
    if (VERSION_PATTERN.test(cells[remoteIndex] ?? '')) {
      remote.add(cells[remoteIndex]!)
    }
  }

  return { local, remote }
}

export function readLocalVersions(migrationsDir: string): string[] {
  if (!existsSync(migrationsDir)) {
    return []
  }

  const versions: string[] = []
  for (const file of readdirSync(migrationsDir).sort()) {
    if (!file.endsWith('.sql')) {
      continue
    }
    const match = FILE_PATTERN.exec(file)
    if (!match) {
      throw new Error(`Invalid migration file name "${file}". Expected <14-digit timestamp>_<snake_case_name>.sql`)
    }
    if (versions.includes(match[1]!)) {
      throw new Error(`Duplicate migration version ${match[1]} in ${migrationsDir}`)
    }
    versions.push(match[1]!)
  }
  return versions
}

export function findForeignVersions(local: string[], remote: Set<string>): string[] {
  const own = new Set(local)
  return Array.from(remote)
    .filter((version) => !own.has(version))
    .sort()
}

function cliCommand(): string[] {
  return (process.env.SUPABASE_BIN ?? 'bunx supabase').split(' ').filter(Boolean)
}

function runCli(args: string[], options: { capture: boolean }): { code: number; stdout: string } {
  const result = Bun.spawnSync([...cliCommand(), ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdout: options.capture ? 'pipe' : 'inherit',
    stderr: 'inherit',
  })
  return { code: result.exitCode ?? 1, stdout: options.capture ? result.stdout.toString() : '' }
}

function loadListing(): { local: string[]; remote: Set<string> } {
  const local = readLocalVersions(join(process.cwd(), 'supabase', 'migrations'))
  const listed = runCli(['migration', 'list', '--linked'], { capture: true })
  if (listed.code !== 0) {
    throw new Error('Could not read the remote migration history. Is the project linked (`bunx supabase link`)?')
  }
  const parsed = parseMigrationList(listed.stdout)
  const mentionsVersions = /\d{14}/.test(listed.stdout)
  if (parsed.local.size + parsed.remote.size === 0 && mentionsVersions) {
    throw new Error(`Could not parse the output of "supabase migration list". Raw output:\n${listed.stdout}`)
  }
  return { local, remote: parsed.remote }
}

function stageProject(foreign: string[]): string {
  const stage = mkdtempSync(join(tmpdir(), 'novatron-db-'))
  cpSync(join(process.cwd(), 'supabase'), join(stage, 'supabase'), { recursive: true })

  const migrationsDir = join(stage, 'supabase', 'migrations')
  mkdirSync(migrationsDir, { recursive: true })
  for (const version of foreign) {
    writeFileSync(
      join(migrationsDir, `${version}_other_project.sql`),
      '-- Applied by another Novatron project. Intentionally empty placeholder (staging only).\n',
    )
  }
  return stage
}

function push(extraArgs: string[]): number {
  const { local, remote } = loadListing()
  const foreign = findForeignVersions(local, remote)
  const pending = local.filter((version) => !remote.has(version))

  console.log(`Local migrations: ${local.length} | pending: ${pending.length} | owned by other projects: ${foreign.length}`)
  if (pending.length === 0) {
    console.log('Nothing to apply.')
    return 0
  }

  const stage = stageProject(foreign)
  try {
    return runCli(['db', 'push', '--linked', '--include-all', '--workdir', stage, ...extraArgs], { capture: false }).code
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }
}

function status(): number {
  const { local, remote } = loadListing()
  const foreign = new Set(findForeignVersions(local, remote))
  const all = Array.from(new Set([...local, ...remote])).sort()

  for (const version of all) {
    const state = foreign.has(version) ? 'other-project' : remote.has(version) ? 'applied' : 'pending'
    console.log(`${version}  ${state}`)
  }
  return 0
}

function main(): number {
  const [command = 'push', ...rest] = process.argv.slice(2)
  try {
    if (command === 'push') {
      return push(rest)
    }
    if (command === 'status') {
      return status()
    }
    console.error(`Unknown command "${command}". Use "push" or "status".`)
    return 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    return 1
  }
}

if (import.meta.main) {
  process.exit(main())
}
