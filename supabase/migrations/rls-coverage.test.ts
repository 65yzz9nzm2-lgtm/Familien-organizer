// Guards the most important security property of the schema: every table
// that holds family- or user-owned data must have Row Level Security enabled
// and at least one policy. This can't replace a real integration test against
// Postgres, but it catches the common regression of adding a new table and
// forgetting `alter table ... enable row level security` / policies -
// exactly the mistake that would let User A read Family B's data.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migrationsDir = dirname(fileURLToPath(import.meta.url))

function readAllMigrations(): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  return files.map((f) => readFileSync(join(migrationsDir, f), 'utf-8')).join('\n')
}

const sql = readAllMigrations()

const createdTables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])

// Tables that intentionally have no RLS of their own because they are never
// queried directly by the client (none currently - kept as an explicit,
// visible allowlist so a future exception has to be a deliberate decision).
const RLS_EXEMPT: string[] = []

describe('Row Level Security coverage', () => {
  it('found the expected set of application tables', () => {
    // Sanity check that the parser above is actually matching the migrations,
    // so this test can't silently pass with an empty table list.
    expect(createdTables.length).toBeGreaterThan(20)
  })

  it.each(createdTables.filter((t) => !RLS_EXEMPT.includes(t)))('%s has Row Level Security enabled', (table) => {
    expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`))
  })

  it.each(createdTables.filter((t) => !RLS_EXEMPT.includes(t)))('%s has at least one RLS policy', (table) => {
    const policyPattern = new RegExp(`create policy "[^"]+" on public\\.${table}\\b`)
    expect(sql).toMatch(policyPattern)
  })

  it('family-scoped tables key their policies off family_id, not just user_id', () => {
    // A representative sample of family-scoped tables: their SELECT policy
    // must check family membership so Family B can never see Family A's rows.
    const familyScoped = ['expenses', 'income', 'calendar_events', 'tasks', 'documents', 'recipes']
    for (const table of familyScoped) {
      expect(policiesFor(table), `policies for ${table}`).toMatch(/is_family_member|is_family_manager/)
    }
  })

  it('private-capable tables restrict private rows to their owner', () => {
    const privacyAware = ['expenses', 'income', 'calendar_events', 'documents']
    for (const table of privacyAware) {
      expect(policiesFor(table), `policies for ${table}`).toMatch(/not is_private or owner_id = auth\.uid\(\)/)
    }
  })
})

/** All `create policy "..." on public.<table> ... ;` blocks for one table. */
function policiesFor(table: string): string {
  const pattern = new RegExp(`create policy "[^"]+" on public\\.${table}\\b[\\s\\S]*?;`, 'g')
  return [...sql.matchAll(pattern)].map((m) => m[0]).join('\n')
}
