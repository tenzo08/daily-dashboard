import Database from 'better-sqlite3'
import { migration_0001_init } from './migrations/0001_init'
import { migration_0002_vault_tasks_activity } from './migrations/0002_vault_tasks_activity'
import { migration_0003_task_links } from './migrations/0003_task_links'
import { migration_0004_credential_health } from './migrations/0004_credential_health'

export type DB = Database.Database

interface Migration {
  name: string
  sql: string
}

// Ordered oldest-first. Add new migrations here as the schema evolves —
// never edit an already-applied migration's SQL.
const migrations: Migration[] = [
  { name: '0001_init', sql: migration_0001_init },
  { name: '0002_vault_tasks_activity', sql: migration_0002_vault_tasks_activity },
  { name: '0003_task_links', sql: migration_0003_task_links },
  { name: '0004_credential_health', sql: migration_0004_credential_health }
]

/**
 * Opens (creating if needed) the SQLite file at `filePath` and applies any
 * migrations not yet recorded in `_migrations`. Safe to call every app
 * start — already-applied migrations are skipped.
 *
 * NOTE: better-sqlite3 is a native module and is kept rebuilt against
 * Electron's ABI via the `postinstall` script (`electron-builder
 * install-app-deps`), not system Node's. `npm run db:harness` therefore
 * runs its script through Electron's own Node runtime
 * (`ELECTRON_RUN_AS_NODE=1 electron ...`) rather than plain `node`/`tsx`,
 * so the harness exercises the exact binary the real app uses.
 */
export function openDatabase(filePath: string): DB {
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

function runMigrations(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row) => (row as { name: string }).name)
  )

  const insertMigration = db.prepare('INSERT INTO _migrations (name) VALUES (?)')

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue
    db.transaction(() => {
      db.exec(migration.sql)
      insertMigration.run(migration.name)
    })()
  }
}
