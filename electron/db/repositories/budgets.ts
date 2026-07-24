import type { DB } from '../index'
import type { BudgetWithSpend } from '../types'

interface BudgetWithSpendRow {
  category_id: number
  category_name: string
  limit_amount: number
  threshold_pct: number
  updated_at: string
  month_spend: number | null
}

function mapBudget(row: BudgetWithSpendRow): BudgetWithSpend {
  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    limitAmount: row.limit_amount,
    thresholdPct: row.threshold_pct,
    updatedAt: row.updated_at,
    monthSpend: row.month_spend ?? 0
  }
}

export function createBudgetsRepository(db: DB) {
  // Month-to-date spend is derived from transactions at read time, not
  // stored, so it's always consistent with the ledger (ARCHITECTURE.md §4).
  const listStmt = db.prepare(`
    SELECT
      b.category_id AS category_id,
      c.name AS category_name,
      b.limit_amount AS limit_amount,
      b.threshold_pct AS threshold_pct,
      b.updated_at AS updated_at,
      (
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.category_id = b.category_id
          AND t.type = 'expense'
          AND strftime('%Y-%m', t.occurred_on) = strftime('%Y-%m', 'now')
      ) AS month_spend
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    ORDER BY c.name
  `)

  const upsertStmt = db.prepare(`
    INSERT INTO budgets (category_id, limit_amount, threshold_pct, updated_at)
    VALUES (@categoryId, @limitAmount, @thresholdPct, datetime('now'))
    ON CONFLICT(category_id) DO UPDATE SET
      limit_amount = excluded.limit_amount,
      threshold_pct = excluded.threshold_pct,
      updated_at = excluded.updated_at
  `)

  return {
    list(): BudgetWithSpend[] {
      return (listStmt.all() as BudgetWithSpendRow[]).map(mapBudget)
    },

    set(categoryId: number, limitAmount: number, thresholdPct = 90): void {
      upsertStmt.run({ categoryId, limitAmount, thresholdPct })
    }
  }
}

export type BudgetsRepository = ReturnType<typeof createBudgetsRepository>
