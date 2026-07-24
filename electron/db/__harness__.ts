// T1.7: standalone repository harness — run with `npm run db:harness`.
// Exercises every Phase 1 repository against a throwaway SQLite file via
// plain tsx (no Electron), proving the data layer before any UI or IPC
// touches it. Delete or convert to a real test runner in a later phase.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from './index'
import { createAccountsRepository } from './repositories/accounts'
import { createBudgetsRepository } from './repositories/budgets'
import { createCategoriesRepository } from './repositories/categories'
import { createFoldersRepository } from './repositories/folders'
import { createNotesRepository } from './repositories/notes'
import { createScheduleRepository } from './repositories/schedule'
import { createSettingsRepository } from './repositories/settings'
import { createTagsRepository } from './repositories/tags'
import { createTransactionsRepository } from './repositories/transactions'

const tmpDir = mkdtempSync(join(tmpdir(), 'daily-dashboard-harness-'))
const dbPath = join(tmpDir, 'data.db')

function cleanup(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

function section(name: string, fn: () => void): void {
  fn()
  console.log(`  ok  ${name}`)
}

try {
  const db = openDatabase(dbPath)
  assert.ok(existsSync(dbPath), 'DB file should be created on disk')

  // --- accounts + transactions + balances ---------------------------
  const accounts = createAccountsRepository(db)
  const categories = createCategoriesRepository(db)
  const transactions = createTransactionsRepository(db)
  const budgets = createBudgetsRepository(db)

  let cash: ReturnType<typeof accounts.create>
  let bank: ReturnType<typeof accounts.create>
  let food: ReturnType<typeof categories.create>

  section('accounts: create + list', () => {
    cash = accounts.create({ name: 'Cash', type: 'cash', initialBalance: 1000 })
    bank = accounts.create({ name: 'Bank', type: 'bank', initialBalance: 5000 })
    const all = accounts.list()
    assert.equal(all.length, 2)
    assert.equal(all.find((a) => a.id === cash.id)?.initialBalance, 1000)
  })

  section('categories: create', () => {
    food = categories.create({ name: 'Food', kind: 'expense' })
    categories.create({ name: 'Salary', kind: 'income' })
    assert.equal(categories.list().length, 2)
  })

  const today = new Date().toISOString().slice(0, 10)

  section('transactions: expense/income/transfer update balances', () => {
    transactions.create({ accountId: cash.id, categoryId: food.id, type: 'expense', amount: 150, occurredOn: today })
    transactions.create({ accountId: bank.id, type: 'income', amount: 2000, occurredOn: today })
    transactions.create({ accountId: bank.id, transferAccountId: cash.id, type: 'transfer', amount: 300, occurredOn: today })

    const balances = accounts.getBalances()
    const cashBalance = balances.find((b) => b.accountId === cash.id)?.balance
    const bankBalance = balances.find((b) => b.accountId === bank.id)?.balance
    // cash: 1000 - 150 (expense) + 300 (transfer in) = 1150
    assert.equal(cashBalance, 1150)
    // bank: 5000 + 2000 (income) - 300 (transfer out) = 6700
    assert.equal(bankBalance, 6700)
  })

  section('budgets: threshold warning math', () => {
    budgets.set(food.id, 200, 90)
    const list = budgets.list()
    const foodBudget = list.find((b) => b.categoryId === food.id)
    assert.ok(foodBudget)
    assert.equal(foodBudget!.monthSpend, 150)
    assert.ok(foodBudget!.monthSpend / foodBudget!.limitAmount < 0.9, 'not yet at threshold')

    transactions.create({ accountId: cash.id, categoryId: food.id, type: 'expense', amount: 60, occurredOn: today })
    const afterMore = budgets.list().find((b) => b.categoryId === food.id)!
    assert.ok(afterMore.monthSpend / afterMore.limitAmount >= 0.9, 'now over threshold (210/200)')
  })

  // --- notes -----------------------------------------------------------
  const folders = createFoldersRepository(db)
  const notes = createNotesRepository(db)
  const tags = createTagsRepository(db)

  section('notes: daily note is idempotent per day', () => {
    const first = notes.getOrCreateDailyNote()
    const second = notes.getOrCreateDailyNote()
    assert.equal(first.id, second.id)
    assert.equal(first.isDaily, true)
    assert.equal(first.noteDate, today)
  })

  section('notes: folders, create, save, tags', () => {
    const journal = folders.create('Journal')
    const note = notes.create({ title: 'Test note', folderId: journal.id, bodyMd: '- [ ] todo' })
    const saved = notes.saveNote(note.id, { bodyMd: '- [x] todo' })
    assert.equal(saved.bodyMd, '- [x] todo')

    const important = tags.getOrCreate('important')
    tags.tagNote(note.id, important.id)
    const noteTags = tags.tagsForNote(note.id)
    assert.equal(noteTags.length, 1)
    assert.equal(noteTags[0].name, 'important')

    const filtered = notes.listNotes({ tagId: important.id })
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].id, note.id)
  })

  // --- schedule + recurrence -------------------------------------------
  const schedule = createScheduleRepository(db)

  section('schedule: one-off item occurs exactly once in range', () => {
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    schedule.createItem({ title: 'Dentist', startAt: start.toISOString() })

    const rangeStart = new Date(start)
    rangeStart.setDate(rangeStart.getDate() - 1)
    const rangeEnd = new Date(start)
    rangeEnd.setDate(rangeEnd.getDate() + 1)

    const occurrences = schedule.listOccurrences(rangeStart.toISOString(), rangeEnd.toISOString())
    assert.equal(occurrences.filter((o) => o.title === 'Dentist').length, 1)
  })

  section('schedule: weekly recurrence expands across multiple weeks', () => {
    const start = new Date()
    start.setHours(8, 0, 0, 0)
    const weekday = start.getDay()
    const byday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][weekday]
    schedule.createItem({
      title: 'Weekly sync',
      startAt: start.toISOString(),
      recurrenceRule: `FREQ=WEEKLY;BYDAY=${byday}`
    })

    const rangeStart = new Date(start)
    const rangeEnd = new Date(start)
    rangeEnd.setDate(rangeEnd.getDate() + 28) // ~4 weeks out

    const occurrences = schedule
      .listOccurrences(rangeStart.toISOString(), rangeEnd.toISOString())
      .filter((o) => o.title === 'Weekly sync')
    assert.ok(occurrences.length >= 4, `expected >=4 weekly occurrences, got ${occurrences.length}`)
  })

  section('schedule: toggleCompletion is per-occurrence-date', () => {
    const item = schedule.createItem({ title: 'Take vitamins', startAt: new Date().toISOString() })
    const dateKey = new Date().toISOString().slice(0, 10)
    let occ = schedule.listOccurrences(
      new Date(Date.now() - 86400000).toISOString(),
      new Date(Date.now() + 86400000).toISOString()
    )
    assert.equal(occ.find((o) => o.itemId === item.id)?.completed, false)

    schedule.toggleCompletion(item.id, dateKey)
    occ = schedule.listOccurrences(
      new Date(Date.now() - 86400000).toISOString(),
      new Date(Date.now() + 86400000).toISOString()
    )
    assert.equal(occ.find((o) => o.itemId === item.id)?.completed, true)
  })

  section('schedule: reminder-fired dedupe', () => {
    const item = schedule.createItem({ title: 'Standup', startAt: new Date().toISOString(), reminderMinutesBefore: 5 })
    const occurrenceAt = new Date().toISOString()
    assert.equal(schedule.isReminderFired(item.id, occurrenceAt), false)
    schedule.markReminderFired(item.id, occurrenceAt)
    assert.equal(schedule.isReminderFired(item.id, occurrenceAt), true)
  })

  // --- settings + migration idempotency ---------------------------------
  const settings = createSettingsRepository(db)

  section('settings: get/set roundtrip', () => {
    assert.equal(settings.get('launch_time'), undefined)
    settings.set('launch_time', '07:30')
    assert.equal(settings.get('launch_time'), '07:30')
    settings.set('launch_time', '08:00')
    assert.equal(settings.get('launch_time'), '08:00')
  })

  db.close()

  section('migrations: reopening the same file is a no-op (idempotent)', () => {
    const reopened = openDatabase(dbPath)
    const row = reopened.prepare('SELECT COUNT(*) AS n FROM _migrations').get() as { n: number }
    assert.equal(row.n, 1)
    reopened.close()
  })

  console.log('\nAll Phase 1 repository checks passed.')
} finally {
  cleanup()
}
