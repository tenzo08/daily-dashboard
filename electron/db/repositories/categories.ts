import type { DB } from '../index'
import type { Category, NewCategory } from '../types'

interface CategoryRow {
  id: number
  name: string
  kind: Category['kind']
  color: string | null
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, kind: row.kind, color: row.color }
}

export function createCategoriesRepository(db: DB) {
  const insertStmt = db.prepare(`INSERT INTO categories (name, kind, color) VALUES (@name, @kind, @color)`)
  const listStmt = db.prepare(`SELECT * FROM categories ORDER BY name`)
  const getStmt = db.prepare(`SELECT * FROM categories WHERE id = ?`)

  return {
    list(): Category[] {
      return (listStmt.all() as CategoryRow[]).map(mapCategory)
    },

    get(id: number): Category | undefined {
      const row = getStmt.get(id) as CategoryRow | undefined
      return row ? mapCategory(row) : undefined
    },

    create(input: NewCategory): Category {
      const result = insertStmt.run({
        name: input.name,
        kind: input.kind,
        color: input.color ?? null
      })
      return mapCategory(getStmt.get(result.lastInsertRowid) as CategoryRow)
    }
  }
}

export type CategoriesRepository = ReturnType<typeof createCategoriesRepository>
