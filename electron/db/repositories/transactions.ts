import type { DB } from '../index'
import type { NewTransaction, Transaction, TransactionFilter } from '../types'

interface TransactionRow {
  id: number
  account_id: number
  category_id: number | null
  type: Transaction['type']
  amount: number
  occurred_on: string
  note: string | null
  transfer_account_id: number | null
  created_at: string
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id,
    type: row.type,
    amount: row.amount,
    occurredOn: row.occurred_on,
    note: row.note,
    transferAccountId: row.transfer_account_id,
    createdAt: row.created_at
  }
}

export function createTransactionsRepository(db: DB) {
  const insertStmt = db.prepare(`
    INSERT INTO transactions (account_id, category_id, type, amount, occurred_on, note, transfer_account_id)
    VALUES (@accountId, @categoryId, @type, @amount, @occurredOn, @note, @transferAccountId)
  `)
  const getStmt = db.prepare(`SELECT * FROM transactions WHERE id = ?`)
  const deleteStmt = db.prepare(`DELETE FROM transactions WHERE id = ?`)

  return {
    list(filter: TransactionFilter = {}): Transaction[] {
      const clauses: string[] = []
      const params: Record<string, unknown> = {}

      if (filter.accountId !== undefined) {
        clauses.push('(account_id = @accountId OR transfer_account_id = @accountId)')
        params.accountId = filter.accountId
      }
      if (filter.categoryId !== undefined) {
        clauses.push('category_id = @categoryId')
        params.categoryId = filter.categoryId
      }
      if (filter.from !== undefined) {
        clauses.push('occurred_on >= @from')
        params.from = filter.from
      }
      if (filter.to !== undefined) {
        clauses.push('occurred_on <= @to')
        params.to = filter.to
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const rows = db
        .prepare(`SELECT * FROM transactions ${where} ORDER BY occurred_on DESC, id DESC`)
        .all(params) as TransactionRow[]
      return rows.map(mapTransaction)
    },

    create(input: NewTransaction): Transaction {
      const result = insertStmt.run({
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount: input.amount,
        occurredOn: input.occurredOn,
        note: input.note ?? null,
        transferAccountId: input.transferAccountId ?? null
      })
      return mapTransaction(getStmt.get(result.lastInsertRowid) as TransactionRow)
    },

    update(id: number, patch: Partial<NewTransaction>): Transaction {
      const current = getStmt.get(id) as TransactionRow
      db.prepare(
        `UPDATE transactions
         SET account_id = @accountId, category_id = @categoryId, type = @type, amount = @amount,
             occurred_on = @occurredOn, note = @note, transfer_account_id = @transferAccountId
         WHERE id = @id`
      ).run({
        id,
        accountId: patch.accountId ?? current.account_id,
        categoryId: patch.categoryId !== undefined ? patch.categoryId : current.category_id,
        type: patch.type ?? current.type,
        amount: patch.amount ?? current.amount,
        occurredOn: patch.occurredOn ?? current.occurred_on,
        note: patch.note !== undefined ? patch.note : current.note,
        transferAccountId:
          patch.transferAccountId !== undefined ? patch.transferAccountId : current.transfer_account_id
      })
      return mapTransaction(getStmt.get(id) as TransactionRow)
    },

    delete(id: number): void {
      deleteStmt.run(id)
    }
  }
}

export type TransactionsRepository = ReturnType<typeof createTransactionsRepository>
