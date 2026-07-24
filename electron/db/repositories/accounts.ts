import type { DB } from '../index'
import type { Account, AccountBalance, NewAccount } from '../types'

interface AccountRow {
  id: number
  name: string
  type: Account['type']
  initial_balance: number
  currency: string
  archived: number
  created_at: string
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: row.initial_balance,
    currency: row.currency,
    archived: row.archived === 1,
    createdAt: row.created_at
  }
}

export function createAccountsRepository(db: DB) {
  const insertStmt = db.prepare(
    `INSERT INTO accounts (name, type, initial_balance, currency) VALUES (@name, @type, @initialBalance, @currency)`
  )
  const listStmt = db.prepare(`SELECT * FROM accounts WHERE archived = 0 ORDER BY name`)
  const listAllStmt = db.prepare(`SELECT * FROM accounts ORDER BY name`)
  const getStmt = db.prepare(`SELECT * FROM accounts WHERE id = ?`)
  const archiveStmt = db.prepare(`UPDATE accounts SET archived = 1 WHERE id = ?`)

  // Net effect of every transaction on every account, computed once and
  // reduced in JS — simpler than a correlated-subquery balance per row,
  // and fine at personal-budget-tracker data volumes.
  const balanceDeltaStmt = db.prepare(`
    SELECT account_id AS accountId, type,
           SUM(amount) AS total
    FROM transactions
    GROUP BY account_id, type
  `)
  const transferInStmt = db.prepare(`
    SELECT transfer_account_id AS accountId, SUM(amount) AS total
    FROM transactions
    WHERE type = 'transfer' AND transfer_account_id IS NOT NULL
    GROUP BY transfer_account_id
  `)

  return {
    list(includeArchived = false): Account[] {
      const rows = (includeArchived ? listAllStmt : listStmt).all() as AccountRow[]
      return rows.map(mapAccount)
    },

    get(id: number): Account | undefined {
      const row = getStmt.get(id) as AccountRow | undefined
      return row ? mapAccount(row) : undefined
    },

    create(input: NewAccount): Account {
      const result = insertStmt.run({
        name: input.name,
        type: input.type,
        initialBalance: input.initialBalance ?? 0,
        currency: input.currency ?? 'PHP'
      })
      return mapAccount(getStmt.get(result.lastInsertRowid) as AccountRow)
    },

    update(id: number, patch: Partial<NewAccount>): Account {
      const current = getStmt.get(id) as AccountRow
      db.prepare(
        `UPDATE accounts SET name = @name, type = @type, initial_balance = @initialBalance, currency = @currency WHERE id = @id`
      ).run({
        id,
        name: patch.name ?? current.name,
        type: patch.type ?? current.type,
        initialBalance: patch.initialBalance ?? current.initial_balance,
        currency: patch.currency ?? current.currency
      })
      return mapAccount(getStmt.get(id) as AccountRow)
    },

    archive(id: number): void {
      archiveStmt.run(id)
    },

    getBalances(): AccountBalance[] {
      const accounts = listAllStmt.all() as AccountRow[]
      const deltas = balanceDeltaStmt.all() as { accountId: number; type: string; total: number }[]
      const transfersIn = transferInStmt.all() as { accountId: number; total: number }[]

      const balances = new Map<number, number>()
      for (const account of accounts) balances.set(account.id, account.initial_balance)

      for (const delta of deltas) {
        const current = balances.get(delta.accountId) ?? 0
        const sign = delta.type === 'income' ? 1 : -1 // expense and transfer-out both subtract
        balances.set(delta.accountId, current + sign * delta.total)
      }
      for (const transferIn of transfersIn) {
        const current = balances.get(transferIn.accountId) ?? 0
        balances.set(transferIn.accountId, current + transferIn.total)
      }

      return accounts.map((account) => ({
        accountId: account.id,
        balance: balances.get(account.id) ?? account.initial_balance
      }))
    },

    getBalance(id: number): number {
      return this.getBalances().find((b) => b.accountId === id)?.balance ?? 0
    }
  }
}

export type AccountsRepository = ReturnType<typeof createAccountsRepository>
