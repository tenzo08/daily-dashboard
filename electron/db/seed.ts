// Dev-only: populates the real dev-mode SQLite DB (the same file `npm run
// dev` uses — %APPDATA%/daily-dashboard/data.db) with realistic sample
// data, so every screen has something to render without manual entry.
// Run via `npm run db:seed`. Safe to re-run: each section tops itself up
// to its target count rather than skipping outright, so running it again
// after adding real data just fills the gap up to the target.
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
import type { CategoryKind, TaskPriority, TaskStatus } from './types'
import { createAuthService } from '../lock/auth'
import { deriveVaultKey, encryptSecret, generateVaultSalt } from '../lock/vaultCrypto'

const DEV_PIN = '1234'
const TARGET = 20 // "at least 20 on each page"

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

function daysAgoKey(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dateKey(d)
}

function daysFromNowKey(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

function atToday(hour: number, minute = 0): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function atDaysFromNow(n: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
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

  // SEED_PIN lets credentials be seeded against an already-set real PIN —
  // passed as an env var for one run only, never written to disk or logged.
  const suppliedPin = process.env['SEED_PIN']

  let vaultKey: Buffer | null = null
  if (!auth.isPinSet()) {
    auth.setPin(DEV_PIN)
    const salt = generateVaultSalt()
    settings.set('vault_kdf_salt', salt)
    vaultKey = await deriveVaultKey(DEV_PIN, salt)
    console.log(`[seed] no PIN was set — set dev PIN to "${DEV_PIN}"`)
  } else if (suppliedPin) {
    const result = auth.verifyPin(suppliedPin)
    if (result.ok) {
      const salt = settings.get('vault_kdf_salt')
      if (salt) {
        vaultKey = await deriveVaultKey(suppliedPin, salt)
        console.log('[seed] supplied PIN verified — vault unlocked for seeding')
      } else {
        console.log('[seed] PIN verified but no vault_kdf_salt found — skipping credentials')
      }
    } else {
      console.log('[seed] supplied PIN was incorrect — skipping credentials')
    }
  } else {
    console.log('[seed] a PIN is already set — will skip credential seeding (vault key unknown)')
  }

  // ---- Accounts + categories (get-or-create by name, not top-up-to-20 —
  // a personal budget app with 20 accounts isn't realistic) ------------
  function ensureAccount(name: string, type: 'cash' | 'bank' | 'credit', initialBalance: number): number {
    const existing = accounts.list(true).find((a) => a.name === name)
    return existing ? existing.id : accounts.create({ name, type, initialBalance }).id
  }
  function ensureCategory(name: string, kind: CategoryKind, color?: string): number {
    const existing = categories.list().find((c) => c.name === name)
    return existing ? existing.id : categories.create({ name, kind, color }).id
  }

  const acctCash = ensureAccount('Cash', 'cash', 5000)
  const acctBank = ensureAccount('BPI Checking', 'bank', 42000)
  const acctCredit = ensureAccount('Credit Card', 'credit', 0)

  const catGroceries = ensureCategory('Groceries', 'expense', '#b0463c')
  const catTransport = ensureCategory('Transport', 'expense', '#a8781e')
  const catUtilities = ensureCategory('Utilities', 'expense', '#6b6860')
  const catDining = ensureCategory('Dining', 'expense', '#4c7a5d')
  const catEntertainment = ensureCategory('Entertainment', 'expense', '#8a5fb0')
  const catHealth = ensureCategory('Health', 'expense', '#2a78d6')
  const catShopping = ensureCategory('Shopping', 'expense', '#e87ba4')
  const catSalary = ensureCategory('Salary', 'income')
  const catFreelance = ensureCategory('Freelance', 'income')

  // ---- Transactions (top up to TARGET + a few, it's the busiest list) --
  const TRANSACTIONS_POOL: {
    type: 'income' | 'expense' | 'transfer'
    accountId: number
    categoryId?: number
    transferAccountId?: number
    amount: number
    note: string
    daysAgo: number
  }[] = [
    { type: 'income', accountId: acctBank, categoryId: catSalary, amount: 48000, note: 'Monthly salary', daysAgo: 3 },
    { type: 'income', accountId: acctBank, categoryId: catFreelance, amount: 12000, note: 'Freelance project', daysAgo: 10 },
    { type: 'expense', accountId: acctCash, categoryId: catGroceries, amount: 1850, note: 'Weekly groceries', daysAgo: 1 },
    { type: 'expense', accountId: acctCash, categoryId: catTransport, amount: 420, note: 'Grab rides', daysAgo: 2 },
    { type: 'expense', accountId: acctBank, categoryId: catUtilities, amount: 3200, note: 'Electric bill', daysAgo: 5 },
    { type: 'expense', accountId: acctCredit, categoryId: catGroceries, amount: 950, note: 'Grocery run', daysAgo: 7 },
    { type: 'expense', accountId: acctCash, categoryId: catDining, amount: 680, note: 'Dinner with friends', daysAgo: 4 },
    { type: 'expense', accountId: acctCredit, categoryId: catEntertainment, amount: 550, note: 'Movie night', daysAgo: 6 },
    { type: 'expense', accountId: acctCash, categoryId: catHealth, amount: 1200, note: 'Pharmacy', daysAgo: 8 },
    { type: 'expense', accountId: acctCredit, categoryId: catShopping, amount: 2400, note: 'New shoes', daysAgo: 9 },
    { type: 'expense', accountId: acctBank, categoryId: catUtilities, amount: 1100, note: 'Water bill', daysAgo: 12 },
    { type: 'expense', accountId: acctCash, categoryId: catGroceries, amount: 1600, note: 'Weekly groceries', daysAgo: 14 },
    { type: 'expense', accountId: acctCash, categoryId: catTransport, amount: 380, note: 'Gas', daysAgo: 15 },
    { type: 'expense', accountId: acctCredit, categoryId: catDining, amount: 890, note: 'Team lunch', daysAgo: 16 },
    { type: 'income', accountId: acctBank, categoryId: catFreelance, amount: 8000, note: 'Bug bounty payout', daysAgo: 18 },
    { type: 'expense', accountId: acctCash, categoryId: catEntertainment, amount: 300, note: 'Streaming subscription', daysAgo: 20 },
    { type: 'expense', accountId: acctCash, categoryId: catShopping, amount: 1750, note: 'Groceries + household', daysAgo: 22 },
    { type: 'expense', accountId: acctBank, categoryId: catUtilities, amount: 2900, note: 'Internet bill', daysAgo: 25 },
    { type: 'income', accountId: acctBank, categoryId: catSalary, amount: 48000, note: 'Monthly salary', daysAgo: 33 },
    { type: 'expense', accountId: acctCredit, categoryId: catGroceries, amount: 1450, note: 'Weekly groceries', daysAgo: 28 },
    { type: 'expense', accountId: acctCash, categoryId: catHealth, amount: 650, note: 'Doctor visit', daysAgo: 30 },
    { type: 'expense', accountId: acctCredit, categoryId: catTransport, amount: 500, note: 'Car wash + parking', daysAgo: 32 },
    { type: 'expense', accountId: acctCash, categoryId: catDining, amount: 420, note: 'Coffee runs', daysAgo: 35 },
    { type: 'income', accountId: acctBank, categoryId: catFreelance, amount: 15000, note: 'Consulting — DevOps', daysAgo: 38 },
    { type: 'transfer', accountId: acctCash, transferAccountId: acctCredit, amount: 2000, note: 'Card payment', daysAgo: 11 }
  ]
  {
    const current = transactions.list({}).length
    const toAdd = TRANSACTIONS_POOL.slice(current)
    for (const t of toAdd) {
      transactions.create({
        accountId: t.accountId,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        occurredOn: daysAgoKey(t.daysAgo),
        note: t.note,
        transferAccountId: t.transferAccountId
      })
    }
    console.log(`[seed] transactions: ${current} existing, added ${toAdd.length}`)
  }

  // ---- Notes -----------------------------------------------------------
  function ensureFolder(name: string): number {
    const existing = folders.list().find((f) => f.name === name)
    return existing ? existing.id : folders.create(name).id
  }
  const folderPersonal = ensureFolder('Personal')
  const folderWork = ensureFolder('Work')

  const NOTES_POOL: { title: string; folderId: number; bodyMd: string }[] = [
    { title: 'Q3 plan', folderId: folderWork, bodyMd: '# Q3 plan\n\n- [ ] Ship vault feature\n- [ ] Write docs\n- [x] Kickoff meeting' },
    { title: 'Grocery list', folderId: folderPersonal, bodyMd: '- Eggs\n- Rice\n- Coffee' },
    { title: 'Book notes', folderId: folderPersonal, bodyMd: 'Currently reading: Designing Data-Intensive Applications' },
    { title: 'Sprint retro notes', folderId: folderWork, bodyMd: '**Went well:** deploy pipeline\n**Improve:** code review turnaround' },
    { title: 'Vacation ideas', folderId: folderPersonal, bodyMd: '- Palawan\n- Japan (spring)\n- Baguio weekend trip' },
    { title: 'Client call notes — Acme Corp', folderId: folderWork, bodyMd: 'Discussed Q4 rollout timeline, follow up next Tuesday.' },
    { title: 'Recipe: Chicken Adobo', folderId: folderPersonal, bodyMd: '- Chicken\n- Soy sauce\n- Vinegar\n- Garlic\n- Bay leaf' },
    { title: '1:1 notes — Manager', folderId: folderWork, bodyMd: 'Talked about promo timeline and Q3 goals.' },
    { title: 'House chores checklist', folderId: folderPersonal, bodyMd: '- [ ] Laundry\n- [ ] Dishes\n- [x] Vacuum' },
    { title: 'Product roadmap ideas', folderId: folderWork, bodyMd: '1. Vault sharing\n2. Mobile companion\n3. Export improvements' },
    { title: 'Gift ideas for Mom', folderId: folderPersonal, bodyMd: '- Cookbook\n- Spa day\n- New bag' },
    { title: 'Bug triage notes', folderId: folderWork, bodyMd: 'Prioritized 4 P1s, deferred 2 P3s to next sprint.' },
    { title: 'Workout plan', folderId: folderPersonal, bodyMd: 'Mon: legs\nWed: push\nFri: pull\nSun: cardio' },
    { title: 'All-hands meeting notes', folderId: folderWork, bodyMd: 'Company hit Q2 targets. New hires starting next month.' },
    { title: 'Reading list 2026', folderId: folderPersonal, bodyMd: '- Designing Data-Intensive Applications\n- The Pragmatic Programmer' },
    { title: 'Onboarding checklist — new hire', folderId: folderWork, bodyMd: '- [ ] Laptop setup\n- [ ] Repo access\n- [ ] Intro meetings' },
    { title: 'Car maintenance log', folderId: folderPersonal, bodyMd: 'Oil change: July. Tire rotation: due next month.' },
    { title: 'Interview questions — Backend role', folderId: folderWork, bodyMd: '1. Explain database indexing\n2. Design a rate limiter' },
    { title: 'Monthly budget review', folderId: folderPersonal, bodyMd: 'Slightly over on dining out this month, on track otherwise.' },
    { title: 'Standup notes — Week 30', folderId: folderWork, bodyMd: 'Blocked on staging env access, otherwise on track.' }
  ]
  {
    const current = notes.listNotes({}).length
    const toAdd = NOTES_POOL.slice(current)
    for (const n of toAdd) notes.create({ title: n.title, folderId: n.folderId, bodyMd: n.bodyMd })
    console.log(`[seed] notes: ${current} existing, added ${toAdd.length}`)
  }

  // ---- Schedule items ----------------------------------------------------
  const SCHEDULE_POOL: { title: string; startAt: string; allDay?: boolean; recurrenceRule?: string; reminderMinutesBefore?: number }[] = [
    { title: 'Standup', startAt: atToday(9), recurrenceRule: 'FREQ=DAILY', reminderMinutesBefore: 5 },
    { title: 'Dentist appointment', startAt: atDaysFromNow(0, 14, 30) },
    { title: 'Gym', startAt: atToday(18), recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' },
    { title: 'Team retro', startAt: atToday(15), recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR' },
    { title: '1:1 with manager', startAt: atToday(10), recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO' },
    { title: 'Grocery run', startAt: atDaysFromNow(1, 11) },
    { title: "Doctor's appointment", startAt: atDaysFromNow(5, 9, 30) },
    { title: 'Car service', startAt: atDaysFromNow(10, 8) },
    { title: 'Pay rent', startAt: atToday(0), allDay: true, recurrenceRule: 'FREQ=MONTHLY' },
    { title: 'Yoga class', startAt: atToday(7), recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU,TH' },
    { title: 'Client demo call', startAt: atDaysFromNow(3, 13) },
    { title: "Mom's birthday", startAt: atDaysFromNow(14, 0), allDay: true },
    { title: 'Quarterly planning', startAt: atDaysFromNow(20, 10) },
    { title: 'Haircut', startAt: atDaysFromNow(6, 16) },
    { title: 'Book club meeting', startAt: atDaysFromNow(8, 19) },
    { title: 'Pharmacy pickup', startAt: atDaysFromNow(2, 12) },
    { title: 'Vet appointment', startAt: atDaysFromNow(9, 10, 30) },
    { title: 'Business trip flight', startAt: atDaysFromNow(15, 6), allDay: true },
    { title: 'Coffee with old colleague', startAt: atDaysFromNow(4, 15, 30) },
    { title: 'Volunteer shift', startAt: atDaysFromNow(12, 9) }
  ]
  {
    const current = schedule.listItems().length
    const toAdd = SCHEDULE_POOL.slice(current)
    for (const s of toAdd) {
      schedule.createItem({
        title: s.title,
        startAt: s.startAt,
        allDay: s.allDay,
        recurrenceRule: s.recurrenceRule,
        reminderMinutesBefore: s.reminderMinutesBefore
      })
    }
    console.log(`[seed] schedule items: ${current} existing, added ${toAdd.length}`)
  }

  // ---- Tasks -------------------------------------------------------------
  const TASKS_POOL: { title: string; description?: string; priority: TaskPriority; status: TaskStatus; dueInDays?: number }[] = [
    { title: 'Deploy v2.4.0 to production', description: 'Includes payments webhook fix and DB index migration.', priority: 'high', status: 'todo', dueInDays: 2 },
    { title: 'Write integration tests for /api/orders', description: 'Cover create/update/cancel flows.', priority: 'medium', status: 'todo' },
    { title: 'Sprint 15 planning', description: 'Groom backlog and estimate carry-over items.', priority: 'medium', status: 'todo', dueInDays: 4 },
    { title: 'Investigate Docker build cache issue', description: 'CI rebuilds full image on every push.', priority: 'low', status: 'in_progress' },
    { title: 'Migrate DB indexes for orders table', priority: 'medium', status: 'done' },
    { title: 'Fix auth token refresh bug', description: 'Refresh token silently fails after 24h idle session.', priority: 'high', status: 'done' },
    { title: 'Review PR #482 payment webhook', description: 'Review Stripe webhook signature verification changes.', priority: 'medium', status: 'in_progress' },
    { title: 'Update dependency: React 19 upgrade', description: 'Upgrade client app and fix breaking changes.', priority: 'low', status: 'done' },
    { title: 'Renew domain registration', priority: 'high', status: 'todo', dueInDays: 1 },
    { title: 'Pay electric bill', priority: 'medium', status: 'todo', dueInDays: 3 },
    { title: 'Back up notes to external drive', priority: 'low', status: 'todo' },
    { title: 'File quarterly taxes', priority: 'high', status: 'done' },
    { title: 'Write API documentation', priority: 'medium', status: 'todo' },
    { title: 'Set up staging environment', priority: 'medium', status: 'in_progress' },
    { title: 'Refactor notification service', priority: 'low', status: 'todo' },
    { title: 'Onboard new engineer', priority: 'medium', status: 'todo', dueInDays: 7 },
    { title: 'Rotate AWS access keys', priority: 'high', status: 'todo' },
    { title: 'Clean up unused Docker images', priority: 'low', status: 'done' },
    { title: 'Prepare demo for stakeholders', priority: 'high', status: 'in_progress', dueInDays: 2 },
    { title: 'Archive old support tickets', priority: 'low', status: 'done' }
  ]
  {
    const current = tasks.list().length
    const toAdd = TASKS_POOL.slice(current)
    for (const t of toAdd) {
      const created = tasks.create({
        title: t.title,
        description: t.description,
        priority: t.priority,
        dueDate: t.dueInDays !== undefined ? daysFromNowKey(t.dueInDays) : undefined
      })
      if (t.status !== 'todo') tasks.setStatus(created.id, t.status)
    }
    console.log(`[seed] tasks: ${current} existing, added ${toAdd.length}`)
  }

  // ---- Credentials (only with a fresh dev-PIN-derived key) -------------
  const CREDENTIALS_POOL: { title: string; username: string; url: string; folder: string }[] = [
    { title: 'GitHub', username: 'demo.user', url: 'https://github.com', folder: 'Work' },
    { title: 'Gmail', username: 'demo.user@example.com', url: 'https://mail.google.com', folder: 'Personal' },
    { title: 'AWS Console', username: 'demo.user@company.example', url: 'https://console.aws.amazon.com', folder: 'Work' },
    { title: 'Netflix', username: 'demo.user@example.com', url: 'https://netflix.com', folder: 'Personal' },
    { title: 'Spotify', username: 'demo.music', url: 'https://spotify.com', folder: 'Personal' },
    { title: 'Dropbox', username: 'demo.user', url: 'https://dropbox.com', folder: 'Work' },
    { title: 'Slack', username: 'demo.user@company.example', url: 'https://slack.com', folder: 'Work' },
    { title: 'Notion', username: 'demo.user', url: 'https://notion.so', folder: 'Work' },
    { title: 'LinkedIn', username: 'demo.user', url: 'https://linkedin.com', folder: 'Personal' },
    { title: 'X (Twitter)', username: 'demo_user', url: 'https://x.com', folder: 'Personal' },
    { title: 'Figma', username: 'demo.user@company.example', url: 'https://figma.com', folder: 'Work' },
    { title: 'Docker Hub', username: 'demo.user', url: 'https://hub.docker.com', folder: 'Work' },
    { title: 'npm', username: 'demo-user', url: 'https://npmjs.com', folder: 'Work' },
    { title: 'DigitalOcean', username: 'demo.user@company.example', url: 'https://digitalocean.com', folder: 'Work' },
    { title: 'Stripe', username: 'demo.user@company.example', url: 'https://dashboard.stripe.com', folder: 'Work' },
    { title: 'PayPal', username: 'demo.user@example.com', url: 'https://paypal.com', folder: 'Personal' },
    { title: 'Online Banking', username: 'demo.user', url: 'https://example-bank.com', folder: 'Personal' },
    { title: 'Amazon', username: 'demo.user@example.com', url: 'https://amazon.com', folder: 'Personal' },
    { title: 'Steam', username: 'demo_user', url: 'https://store.steampowered.com', folder: 'Personal' },
    { title: 'Discord', username: 'demo.user', url: 'https://discord.com', folder: 'Personal' }
  ]
  if (vaultKey) {
    const key = vaultKey
    const current = credentials.list().length
    const toAdd = CREDENTIALS_POOL.slice(current)
    for (const [i, c] of toAdd.entries()) {
      const password = `Sample-Pw-${current + i + 1}-${Math.random().toString(36).slice(2, 8)}`
      const encrypted = encryptSecret(JSON.stringify({ password, notes: null }), key)
      credentials.create({ title: c.title, username: c.username, url: c.url, folder: c.folder, ...encrypted })
    }
    console.log(`[seed] credentials: ${current} existing, added ${toAdd.length}`)
  } else {
    console.log('[seed] skipped credentials (no vault key available — a PIN was already set)')
  }

  // ---- Activity log ------------------------------------------------------
  const ACTIVITY_POOL: { eventType: string; message: string }[] = [
    { eventType: 'note.created', message: 'Created note — Q3 plan' },
    { eventType: 'transaction.created', message: 'Logged expense — Groceries' },
    { eventType: 'task.completed', message: 'Completed — Migrate DB indexes for orders table' },
    { eventType: 'task.completed', message: 'Completed — Fix auth token refresh bug' },
    { eventType: 'note.created', message: 'Created note — Sprint retro notes' },
    { eventType: 'transaction.created', message: 'Logged income — Freelance project' },
    { eventType: 'schedule.created', message: 'Scheduled — Client demo call' },
    { eventType: 'task.created', message: 'Added task — Review PR #482 payment webhook' },
    { eventType: 'credential.created', message: 'Added credential — GitHub' },
    { eventType: 'note.created', message: 'Created note — Vacation ideas' },
    { eventType: 'transaction.created', message: 'Logged expense — Electric bill' },
    { eventType: 'task.completed', message: 'Completed — Update dependency: React 19 upgrade' },
    { eventType: 'schedule.completed', message: 'Completed — Gym' },
    { eventType: 'note.created', message: 'Created note — Client call notes — Acme Corp' },
    { eventType: 'credential.created', message: 'Added credential — Gmail' },
    { eventType: 'transaction.created', message: 'Logged expense — Grocery run' },
    { eventType: 'task.created', message: 'Added task — Set up staging environment' },
    { eventType: 'note.created', message: 'Created note — Product roadmap ideas' },
    { eventType: 'schedule.created', message: 'Scheduled — Quarterly planning' },
    { eventType: 'credential.created', message: 'Added credential — AWS Console' }
  ]
  {
    const current = activity.list(1000).length
    const toAdd = ACTIVITY_POOL.slice(current)
    for (const a of toAdd) activity.log(a.eventType, a.message)
    console.log(`[seed] activity log: ${current} existing, added ${toAdd.length}`)
  }

  db.close()
  console.log(`\n[seed] done. Target was ${TARGET}+ per list.`)
}

main().catch((error) => {
  console.error('[seed] failed:', error)
  process.exitCode = 1
})
