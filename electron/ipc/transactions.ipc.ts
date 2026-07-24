import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createCategoriesRepository } from '../db/repositories/categories'
import { createTransactionsRepository } from '../db/repositories/transactions'
import type { NewTransaction, TransactionFilter } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerTransactionsHandlers(db: DB): void {
  const transactions = createTransactionsRepository(db)
  const categories = createCategoriesRepository(db)
  const activity = createActivityLogRepository(db)

  registerHandler('transactions:list', (filter?: TransactionFilter) => transactions.list(filter ?? {}))
  registerHandler('transactions:create', (input: NewTransaction) => {
    const txn = transactions.create(input)
    const categoryName = txn.categoryId ? categories.list().find((c) => c.id === txn.categoryId)?.name : undefined
    const verb = txn.type === 'income' ? 'Logged income' : txn.type === 'expense' ? 'Logged expense' : 'Logged transfer'
    activity.log('transaction.created', `${verb} — ${categoryName ?? txn.note ?? txn.amount.toLocaleString()}`)
    return txn
  })
  registerHandler('transactions:update', (id: number, patch: Partial<NewTransaction>) =>
    transactions.update(id, patch)
  )
  registerHandler('transactions:delete', (id: number) => {
    transactions.delete(id)
    activity.log('transaction.deleted', 'Deleted a transaction')
  })
}
