import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createScheduleRepository } from '../db/repositories/schedule'
import type { NewScheduleItem } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerScheduleHandlers(db: DB): void {
  const schedule = createScheduleRepository(db)
  const activity = createActivityLogRepository(db)

  registerHandler('schedule:listOccurrences', (rangeStartISO: string, rangeEndISO: string) =>
    schedule.listOccurrences(rangeStartISO, rangeEndISO)
  )
  registerHandler('schedule:getItem', (id: number) => schedule.getItem(id))
  registerHandler('schedule:createItem', (input: NewScheduleItem) => {
    const item = schedule.createItem(input)
    activity.log('schedule.created', `Scheduled — ${item.title}`)
    return item
  })
  registerHandler('schedule:updateItem', (id: number, patch: Partial<NewScheduleItem>) =>
    schedule.updateItem(id, patch)
  )
  registerHandler('schedule:deleteItem', (id: number) => {
    const item = schedule.getItem(id)
    schedule.deleteItem(id)
    if (item) activity.log('schedule.deleted', `Removed from schedule — ${item.title}`)
  })
  registerHandler('schedule:toggleCompletion', (itemId: number, occurrenceDate: string) => {
    const nowCompleted = schedule.toggleCompletion(itemId, occurrenceDate)
    // Only log the transition to done so un-checking a box doesn't spam the feed.
    if (nowCompleted) {
      const item = schedule.getItem(itemId)
      if (item) activity.log('schedule.completed', `Completed — ${item.title}`)
    }
  })
}
