import type { DB } from '../db'
import { createCategoriesRepository } from '../db/repositories/categories'
import type { NewCategory } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerCategoriesHandlers(db: DB): void {
  const categories = createCategoriesRepository(db)

  registerHandler('categories:list', () => categories.list())
  registerHandler('categories:create', (input: NewCategory) => categories.create(input))
}
