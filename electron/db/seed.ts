// Dev-only: populates the real dev-mode SQLite DB (the same file `npm run
// dev` uses — %APPDATA%/daily-dashboard/data.db) with realistic sample
// data, so every screen has something to render without manual entry.
// Run via `npm run db:seed`. Safe to re-run: each section skips itself if
// that table already has rows.
//
// Credentials are the one exception — they must be encrypted with a real
// Argon2id-derived key (electron/lock/vaultCrypto.ts), not a stub, so this
// seeds a known dev PIN (only if none is set yet) to derive that key. If a
// real PIN already exists, credential seeding is skipped since the
// plaintext PIN — and therefore the key — isn't recoverable from it.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { openDatabase } from './index'
import { createAccountsRepository } from './repositories/accounts'
import { createActivityLogRepository } from './repositories/activityLog'
import { createCategoriesRepository } from './repositories/categories'
import { createCredentialsRepository } from './repositories/credentials'
import { createFoldersRepository } from './repositories/folders'
import { createNotesRepository } from './repositories/notes'
import { createScheduleRepository } from './repositories/schedule'
import { createSettingsRepository } from './repositories/settings'
import { createTasksRepository } from './repositories/tasks'
import { createTransactionsRepository } from './repositories/transactions'
import { createAuthService } from '../lock/auth'
import { deriveVaultKey, encryptSecret, generateVaultSalt } from '../lock/vaultCrypto'

const DEV_PIN = '1234'

function resolveDevUserDataDir(): string {
  const appData = process.env['APPDATA']
  if (!appData) throw new Error('APPDATA is not set — this script assumes a Windows dev environment')
  // Electron's default userData path: {appData}/{package.json "name"} — see
  // ARCHITECTURE.md's data file location note.
  return join(appData, 'daily-dashboard')
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

async function main(): Promise<void> {
  const userDataDir = resolveDevUserDataDir()
  mkdirSync(userDataDir, { recursive: true })
  const db = openDatabase(join(userDataDir, 'data.db'))

  const settings = createSettingsRepository(db)
  const auth = createAuthService(settings)
  const accounts = createAccountsRepository(db)
  const categories = createCategoriesRepository(db)
  const transactions = createTransactionsRepository(db)
  const folders = createFoldersRepository(db)
  const notes = createNotesRepository(db)
  const schedule = createScheduleRepository(db)
  const tasks = createTasksRepository(db)
  const credentials = createCredentialsRepository(db)
  const activity = createActivityLogRepository(db)

  let vaultKey: Buffer | null = null
  if (!auth.isPinSet()) {
    auth.setPin(DEV_PIN)
    const salt = generateVaultSalt()
    settings.set('vault_kdf_salt', salt)
    vaultKey = await deriveVaultKey(DEV_PIN, salt)
    console.log(`[seed] no PIN was set — set dev PIN to "${DEV_PIN}"`)
  } else {
    console.log('[seed] a PIN is already set — will skip credential seeding (vault key unknown)')
  }

  if (accounts.list().length === 0) {
    const cash = accounts.create({ name: 'Cash', type: 'cash', initialBalance: 5000 })
    const bank = accounts.create({ name: 'BPI Checking', type: 'bank', initialBalance: 42000 })
    const credit = accounts.create({ name: 'Credit Card', type: 'credit', initialBalance: 0 })

    const groceries = categories.create({ name: 'Groceries', kind: 'expense', color: '#b0463c' })
    const transport = categories.create({ name: 'Transport', kind: 'expense', color: '#a8781e' })
    const utilities = categories.create({ name: 'Utilities', kind: 'expense', color: '#6b6860' })
    const salary = categories.create({ name: 'Salary', kind: 'income' })
    const freelance = categories.create({ name: 'Freelance', kind: 'income' })

    transactions.create({
      accountId: bank.id,
      categoryId: salary.id,
      type: 'income',
      amount: 48000,
      occurredOn: dateKey(daysAgo(3)),
      note: 'Monthly salary'
    })
    transactions.create({
      accountId: bank.id,
      categoryId: freelance.id,
      type: 'income',
      amount: 12000,
      occurredOn: dateKey(daysAgo(10)),
      note: 'Freelance project'
    })
    transactions.create({
      accountId: cash.id,
      categoryId: groceries.id,
      type: 'expense',
      amount: 1850,
      occurredOn: dateKey(daysAgo(1)),
      note: 'Weekly groceries'
    })
    transactions.create({
      accountId: cash.id,
      categoryId: transport.id,
      type: 'expense',
      amount: 420,
      occurredOn: dateKey(daysAgo(2)),
      note: 'Grab rides'
    })
    transactions.create({
      accountId: bank.id,
      categoryId: utilities.id,
      type: 'expense',
      amount: 3200,
      occurredOn: dateKey(daysAgo(5)),
      note: 'Electric bill'
    })
    transactions.create({
      accountId: credit.id,
      categoryId: groceries.id,
      type: 'expense',
      amount: 950,
      occurredOn: dateKey(daysAgo(7)),
      note: 'Grocery run'
    })
    console.log('[seed] accounts, categories, and transactions created')
  } else {
    console.log('[seed] accounts already exist — skipping')
  }

  if (notes.listNotes({}).length === 0) {
    const personal = folders.create('Personal')
    const work = folders.create('Work')
    notes.create({
      title: 'Q3 plan',
      folderId: work.id,
      bodyMd: '# Q3 plan\n\n- [ ] Ship vault feature\n- [ ] Write docs\n- [x] Kickoff meeting'
    })
    notes.create({ title: 'Grocery list', folderId: personal.id, bodyMd: '- Eggs\n- Rice\n- Coffee' })
    notes.create({
      title: 'Book notes',
      folderId: personal.id,
      bodyMd: 'Currently reading: Designing Data-Intensive Applications'
    })
    console.log('[seed] notes created')
  } else {
    console.log('[seed] notes already exist — skipping')
  }

  if (schedule.listItems().length === 0) {
    const now = new Date()
    const at = (h: number, m = 0): string => {
      const d = new Date(now)
      d.setHours(h, m, 0, 0)
      return d.toISOString()
    }
    schedule.createItem({ title: 'Standup', startAt: at(9), recurrenceRule: 'FREQ=DAILY', reminderMinutesBefore: 5 })
    schedule.createItem({ title: 'Dentist appointment', startAt: at(14, 30) })
    schedule.createItem({ title: 'Gym', startAt: at(18), recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' })
    console.log('[seed] schedule items created')
  } else {
    console.log('[seed] schedule items already exist — skipping')
  }

  if (tasks.list().length === 0) {
    tasks.create({
      title: 'Deploy v2.4.0 to production',
      description: 'Includes payments webhook fix and DB index migration.',
      priority: 'high',
      dueDate: daysFromNow(2)
    })
    tasks.create({
      title: 'Write integration tests for /api/orders',
      description: 'Cover create/update/cancel flows.',
      priority: 'medium'
    })
    tasks.create({
      title: 'Sprint 15 planning',
      description: 'Groom backlog and estimate carry-over items.',
      priority: 'medium',
      dueDate: daysFromNow(4)
    })
    const inProgress = tasks.create({
      title: 'Investigate Docker build cache issue',
      description: 'CI rebuilds full image on every push.',
      priority: 'low'
    })
    tasks.setStatus(inProgress.id, 'in_progress')
    const done1 = tasks.create({ title: 'Migrate DB indexes for orders table', priority: 'medium' })
    tasks.setStatus(done1.id, 'done')
    const done2 = tasks.create({
      title: 'Fix auth token refresh bug',
      description: 'Refresh token silently fails after 24h idle session.',
      priority: 'high'
    })
    tasks.setStatus(done2.id, 'done')
    console.log('[seed] tasks created')
  } else {
    console.log('[seed] tasks already exist — skipping')
  }

  if (vaultKey && credentials.list().length === 0) {
    const key = vaultKey
    const seedCredential = (title: string, username: string, password: string, url: string, folder: string): void => {
      const encrypted = encryptSecret(JSON.stringify({ password, notes: null }), key)
      credentials.create({ title, username, url, folder, ...encrypted })
    }
    seedCredential('GitHub', 'raphael.dev', 'correct-horse-battery-staple-1', 'https://github.com', 'Work')
    seedCredential('Gmail', 'raphaellizarde08@gmail.com', 'another-strong-passphrase-2', 'https://mail.google.com', 'Personal')
    seedCredential('AWS Console', 'raphael@company.com', 'aws-root-rotate-me-3', 'https://console.aws.amazon.com', 'Work')
    console.log('[seed] credentials created')
  } else if (!vaultKey) {
    console.log('[seed] skipped credentials (no vault key available)')
  } else {
    console.log('[seed] credentials already exist — skipping')
  }

  if (activity.list(1).length === 0) {
    activity.log('note.created', 'Created note — Q3 plan')
    activity.log('transaction.created', 'Logged expense — Groceries')
    activity.log('task.completed', 'Completed — Migrate DB indexes for orders table')
    if (vaultKey) activity.log('credential.created', 'Added credential — GitHub')
    console.log('[seed] activity log seeded')
  } else {
    console.log('[seed] activity log already has entries — skipping')
  }

  db.close()
  console.log('\n[seed] done.')
}

main().catch((error) => {
  console.error('[seed] failed:', error)
  process.exitCode = 1
})
