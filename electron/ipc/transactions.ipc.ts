import type { DB } from '../db'
import { createTransactionsRepository } from '../db/repositories/transactions'
import type { NewTransaction, TransactionFilter } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerTransactionsHandlers(db: DB): void {
  const transactions = createTransactionsRepository(db)

  registerHandler('transactions:list', (filter?: TransactionFilter) => transactions.list(filter ?? {}))
  registerHandler('transactions:create', (input: NewTransaction) => transactions.create(input))
  registerHandler('transactions:update', (id: number, patch: Partial<NewTransaction>) =>
    transactions.update(id, patch)
  )
  registerHandler('transactions:delete', (id: number) => transactions.delete(id))
}
