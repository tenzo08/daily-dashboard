import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createTasksRepository } from '../db/repositories/tasks'
import type { NewTask, TaskFilter, TaskRecurrenceRule, TaskStatus } from '../db/types'
import { registerHandler } from './registerHandler'

function advanceDate(dateKey: string, rule: TaskRecurrenceRule): string {
  const d = new Date(`${dateKey}T00:00:00`)
  if (rule === 'daily') d.setDate(d.getDate() + 1)
  else if (rule === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function registerTasksHandlers(db: DB): void {
  const tasks = createTasksRepository(db)
  const activity = createActivityLogRepository(db)

  registerHandler('tasks:list', (filter?: TaskFilter) => tasks.list(filter ?? {}))

  registerHandler('tasks:create', (input: NewTask) => {
    const task = tasks.create(input)
    activity.log('task.created', `Added task — ${task.title}`)
    return task
  })

  registerHandler('tasks:update', (id: number, patch: Partial<NewTask>) => tasks.update(id, patch))

  registerHandler('tasks:setStatus', (id: number, status: TaskStatus) => {
    const task = tasks.setStatus(id, status)
    if (status === 'done') {
      activity.log('task.completed', `Completed — ${task.title}`)

      // Recurring tasks spawn their next copy on completion, rather than
      // pre-expanding occurrences like schedule items do — a task board
      // doesn't need a calendar view of future instances.
      if (task.recurrenceRule) {
        const nextDueDate = advanceDate(task.dueDate ?? new Date().toISOString().slice(0, 10), task.recurrenceRule)
        const next = tasks.create({
          title: task.title,
          description: task.description ?? undefined,
          priority: task.priority,
          dueDate: nextDueDate,
          linkedNoteId: task.linkedNoteId,
          linkedScheduleItemId: task.linkedScheduleItemId,
          recurrenceRule: task.recurrenceRule
        })
        activity.log('task.created', `Next occurrence — ${next.title} (${nextDueDate})`)
      }
    }
    return task
  })

  registerHandler('tasks:delete', (id: number) => {
    const task = tasks.get(id)
    tasks.delete(id)
    if (task) activity.log('task.deleted', `Deleted task — ${task.title}`)
  })
}
