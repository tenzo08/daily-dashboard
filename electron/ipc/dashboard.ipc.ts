import type { DB } from '../db'
import { createAccountsRepository } from '../db/repositories/accounts'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createCategoriesRepository } from '../db/repositories/categories'
import { createCredentialsRepository } from '../db/repositories/credentials'
import { createNotesRepository } from '../db/repositories/notes'
import { createScheduleRepository } from '../db/repositories/schedule'
import { createTasksRepository } from '../db/repositories/tasks'
import { createTransactionsRepository } from '../db/repositories/transactions'
import { toDateKey } from '../../src/lib/rruleHelpers'
import { registerHandler } from './registerHandler'

const UPCOMING_TASKS_LIMIT = 5
const RECENT_ACTIVITY_LIMIT = 8

export function registerDashboardHandlers(db: DB): void {
  const notes = createNotesRepository(db)
  const schedule = createScheduleRepository(db)
  const accounts = createAccountsRepository(db)
  const categories = createCategoriesRepository(db)
  const transactions = createTransactionsRepository(db)
  const credentials = createCredentialsRepository(db)
  const tasks = createTasksRepository(db)
  const activity = createActivityLogRepository(db)

  registerHandler('dashboard:getToday', () => {
    const note = notes.getOrCreateDailyNote()

    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const scheduleOccurrences = schedule.listOccurrences(dayStart.toISOString(), dayEnd.toISOString())

    const accountBalances = accounts.getBalances()

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthTxns = transactions.list({ from: toDateKey(monthStart), to: toDateKey(now) })
    const categoryNameById = new Map(categories.list().map((c) => [c.id, c.name]))
    const spendByCategory = new Map<number, number>()
    let monthIncome = 0
    for (const txn of monthTxns) {
      if (txn.type === 'income') {
        monthIncome += txn.amount
        continue
      }
      if (txn.type !== 'expense' || txn.categoryId === null) continue
      spendByCategory.set(txn.categoryId, (spendByCategory.get(txn.categoryId) ?? 0) + txn.amount)
    }
    const monthSpendByCategory = Array.from(spendByCategory.entries()).map(([categoryId, amount]) => ({
      categoryId,
      categoryName: categoryNameById.get(categoryId) ?? 'Unknown',
      amount
    }))

    const upcomingTasks = tasks.list({}).filter((t) => t.status !== 'done').slice(0, UPCOMING_TASKS_LIMIT)

    return {
      note,
      schedule: scheduleOccurrences,
      tasks: upcomingTasks,
      activity: activity.list(RECENT_ACTIVITY_LIMIT),
      counts: {
        credentials: credentials.list().length,
        notes: notes.listNotes({}).length,
        openTasks: tasks.countOpen()
      },
      budgetSnapshot: { accountBalances, monthSpendByCategory, monthIncome }
    }
  })
}
