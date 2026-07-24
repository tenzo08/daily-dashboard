import { dialog } from 'electron'
import * as fs from 'node:fs'
import type { DB } from '../db'
import { createCredentialsRepository } from '../db/repositories/credentials'
import { decryptSecret, encryptSecret } from '../lock/vaultCrypto'
import { vaultSession } from '../lock/vaultSession'
import { registerHandler } from './registerHandler'

const BACKUP_VERSION = 1

// Settings that are safe to export — never the PIN hash/salt, lockout
// state, or vault_kdf_salt. Exporting those would let a stolen backup
// file be brute-forced offline, and they're meaningless on a fresh
// install anyway (a new PIN sets its own).
const EXPORTABLE_SETTINGS = ['launch_time', 'idle_lock_minutes', 'activity_retention_days']

// Tables that must ALL be empty before an import proceeds — every row is
// inserted with its original id preserved (so foreign keys still line up),
// which would collide with anything already present.
const IMPORT_TARGET_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'note_folders',
  'notes',
  'tags',
  'schedule_items',
  'tasks',
  'credentials'
]

interface BackupFile {
  version: number
  exportedAt: string
  settings: Record<string, string>
  accounts: unknown[]
  categories: unknown[]
  budgets: unknown[]
  transactions: unknown[]
  noteFolders: unknown[]
  notes: unknown[]
  tags: unknown[]
  noteTags: unknown[]
  scheduleItems: unknown[]
  scheduleCompletions: unknown[]
  tasks: unknown[]
  credentials: { id: number; title: string; username: string | null; url: string | null; folder: string | null; password: string; notes: string | null; createdAt: string; updatedAt: string }[]
}

function insertRows(db: DB, table: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return
  const columns = Object.keys(rows[0])
  const placeholders = columns.map((c) => '@' + c).join(', ')
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
  for (const row of rows) stmt.run(row)
}

export function registerBackupHandlers(db: DB): void {
  const credentials = createCredentialsRepository(db)

  registerHandler('backup:export', async () => {
    const key = vaultSession.require()

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Daily Dashboard data',
      defaultPath: `daily-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { path: null }

    const settingsRows = db
      .prepare(`SELECT key, value FROM app_settings WHERE key IN (${EXPORTABLE_SETTINGS.map(() => '?').join(',')})`)
      .all(...EXPORTABLE_SETTINGS) as { key: string; value: string }[]

    const backup: BackupFile = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: Object.fromEntries(settingsRows.map((row) => [row.key, row.value])),
      accounts: db.prepare('SELECT * FROM accounts').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      budgets: db.prepare('SELECT * FROM budgets').all(),
      transactions: db.prepare('SELECT * FROM transactions').all(),
      noteFolders: db.prepare('SELECT * FROM note_folders').all(),
      notes: db.prepare('SELECT * FROM notes').all(),
      tags: db.prepare('SELECT * FROM tags').all(),
      noteTags: db.prepare('SELECT * FROM note_tags').all(),
      scheduleItems: db.prepare('SELECT * FROM schedule_items').all(),
      scheduleCompletions: db.prepare('SELECT * FROM schedule_completions').all(),
      tasks: db.prepare('SELECT * FROM tasks').all(),
      // The one section that needs decryption — everything else is a
      // straight row dump. Plaintext passwords in this file are the
      // unavoidable cost of a backup actually being restorable; the
      // renderer warns about this before the save dialog opens.
      credentials: credentials.listAll().map((row) => {
        const secret = decryptSecret(row, key)
        const parsed = JSON.parse(secret) as { password: string; notes: string | null }
        return {
          id: row.id,
          title: row.title,
          username: row.username,
          url: row.url,
          folder: row.folder,
          password: parsed.password,
          notes: parsed.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }
      })
    }

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8')
    return { path: filePath }
  })

  registerHandler('backup:import', async () => {
    const key = vaultSession.require()

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Daily Dashboard data',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { imported: false, path: null }

    const filePath = filePaths[0]
    const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as BackupFile

    const counts = IMPORT_TARGET_TABLES.map(
      (table) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
    )
    if (counts.some((n) => n > 0)) {
      throw new Error(
        'Import only works into a fresh vault (all of accounts/notes/tasks/schedule/vault must be empty). ' +
          'Use "Forgot PIN" to reset first if you want to restore this backup.'
      )
    }

    const run = db.transaction(() => {
      for (const [settingKey, value] of Object.entries(backup.settings)) {
        if (!EXPORTABLE_SETTINGS.includes(settingKey)) continue
        db.prepare(
          `INSERT INTO app_settings (key, value) VALUES (@key, @value)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        ).run({ key: settingKey, value })
      }

      insertRows(db, 'accounts', backup.accounts as Record<string, unknown>[])
      insertRows(db, 'categories', backup.categories as Record<string, unknown>[])
      insertRows(db, 'budgets', backup.budgets as Record<string, unknown>[])
      insertRows(db, 'transactions', backup.transactions as Record<string, unknown>[])
      insertRows(db, 'note_folders', backup.noteFolders as Record<string, unknown>[])
      insertRows(db, 'notes', backup.notes as Record<string, unknown>[])
      insertRows(db, 'tags', backup.tags as Record<string, unknown>[])
      insertRows(db, 'note_tags', backup.noteTags as Record<string, unknown>[])
      insertRows(db, 'schedule_items', backup.scheduleItems as Record<string, unknown>[])
      insertRows(db, 'schedule_completions', backup.scheduleCompletions as Record<string, unknown>[])
      insertRows(db, 'tasks', backup.tasks as Record<string, unknown>[])

      const insertCredential = db.prepare(`
        INSERT INTO credentials (id, title, username, url, folder, secret_cipher, secret_iv, secret_tag, created_at, updated_at)
        VALUES (@id, @title, @username, @url, @folder, @secretCipher, @secretIv, @secretTag, @createdAt, @updatedAt)
      `)
      for (const cred of backup.credentials) {
        const encrypted = encryptSecret(JSON.stringify({ password: cred.password, notes: cred.notes }), key)
        insertCredential.run({
          id: cred.id,
          title: cred.title,
          username: cred.username,
          url: cred.url,
          folder: cred.folder,
          ...encrypted,
          createdAt: cred.createdAt,
          updatedAt: cred.updatedAt
        })
      }
    })
    run()

    return { imported: true, path: filePath }
  })
}
