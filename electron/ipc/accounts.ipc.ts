import type { DB } from '../db'
import { createAccountsRepository } from '../db/repositories/accounts'
import type { NewAccount } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerAccountsHandlers(db: DB): void {
  const accounts = createAccountsRepository(db)

  registerHandler('accounts:list', (includeArchived?: boolean) => accounts.list(includeArchived))
  registerHandler('accounts:create', (input: NewAccount) => accounts.create(input))
  registerHandler('accounts:update', (id: number, patch: Partial<NewAccount>) => accounts.update(id, patch))
  registerHandler('accounts:archive', (id: number) => accounts.archive(id))
  registerHandler('accounts:getBalances', () => accounts.getBalances())
}
