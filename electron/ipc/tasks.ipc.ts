import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createTasksRepository } from '../db/repositories/tasks'
import type { NewTask, TaskFilter, TaskStatus } from '../db/types'
import { registerHandler } from './registerHandler'

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
    if (status === 'done') activity.log('task.completed', `Completed — ${task.title}`)
    return task
  })

  registerHandler('tasks:delete', (id: number) => {
    const task = tasks.get(id)
    tasks.delete(id)
    if (task) activity.log('task.deleted', `Deleted task — ${task.title}`)
  })
}
