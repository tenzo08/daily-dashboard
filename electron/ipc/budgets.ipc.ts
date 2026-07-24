import type { DB } from '../db'
import { createBudgetsRepository } from '../db/repositories/budgets'
import { registerHandler } from './registerHandler'

export function registerBudgetsHandlers(db: DB): void {
  const budgets = createBudgetsRepository(db)

  registerHandler('budgets:list', () => budgets.list())
  registerHandler('budgets:set', (categoryId: number, limitAmount: number, thresholdPct?: number) =>
    budgets.set(categoryId, limitAmount, thresholdPct)
  )
}
