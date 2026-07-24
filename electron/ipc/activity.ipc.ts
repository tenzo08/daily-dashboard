import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { registerHandler } from './registerHandler'

export function registerActivityHandlers(db: DB): void {
  const activity = createActivityLogRepository(db)

  registerHandler('activity:list', (limit?: number) => activity.list(limit))
}
