import type { DB } from '../db'
import { createScheduleRepository } from '../db/repositories/schedule'
import type { NewScheduleItem } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerScheduleHandlers(db: DB): void {
  const schedule = createScheduleRepository(db)

  registerHandler('schedule:listOccurrences', (rangeStartISO: string, rangeEndISO: string) =>
    schedule.listOccurrences(rangeStartISO, rangeEndISO)
  )
  registerHandler('schedule:getItem', (id: number) => schedule.getItem(id))
  registerHandler('schedule:createItem', (input: NewScheduleItem) => schedule.createItem(input))
  registerHandler('schedule:updateItem', (id: number, patch: Partial<NewScheduleItem>) =>
    schedule.updateItem(id, patch)
  )
  registerHandler('schedule:deleteItem', (id: number) => schedule.deleteItem(id))
  registerHandler('schedule:toggleCompletion', (itemId: number, occurrenceDate: string) =>
    schedule.toggleCompletion(itemId, occurrenceDate)
  )
}
