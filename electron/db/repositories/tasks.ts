import type { DB } from '../index'
import type { NewTask, Task, TaskFilter, TaskPriority, TaskStatus } from '../types'

interface TaskRow {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createTasksRepository(db: DB) {
  const insertStmt = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date)
    VALUES (@title, @description, @priority, @dueDate)
  `)
  const getStmt = db.prepare(`SELECT * FROM tasks WHERE id = ?`)
  const listAllStmt = db.prepare(`
    SELECT * FROM tasks ORDER BY (due_date IS NULL), due_date, priority = 'high' DESC, created_at
  `)
  const listByStatusStmt = db.prepare(`
    SELECT * FROM tasks WHERE status = @status
    ORDER BY (due_date IS NULL), due_date, priority = 'high' DESC, created_at
  `)
  const updateStmt = db.prepare(`
    UPDATE tasks
    SET title = @title, description = @description, priority = @priority, due_date = @dueDate,
        updated_at = datetime('now')
    WHERE id = @id
  `)
  const setStatusStmt = db.prepare(`
    UPDATE tasks
    SET status = @status, completed_at = @completedAt, updated_at = datetime('now')
    WHERE id = @id
  `)
  const deleteStmt = db.prepare(`DELETE FROM tasks WHERE id = ?`)
  const countOpenStmt = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE status != 'done'`)

  return {
    list(filter: TaskFilter = {}): Task[] {
      const rows = (
        filter.status ? listByStatusStmt.all({ status: filter.status }) : listAllStmt.all()
      ) as TaskRow[]
      return rows.map(mapTask)
    },

    get(id: number): Task | undefined {
      const row = getStmt.get(id) as TaskRow | undefined
      return row ? mapTask(row) : undefined
    },

    create(input: NewTask): Task {
      const result = insertStmt.run({
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate ?? null
      })
      return mapTask(getStmt.get(result.lastInsertRowid) as TaskRow)
    },

    update(id: number, patch: Partial<NewTask>): Task {
      const current = getStmt.get(id) as TaskRow
      updateStmt.run({
        id,
        title: patch.title ?? current.title,
        description: patch.description !== undefined ? patch.description : current.description,
        priority: patch.priority ?? current.priority,
        dueDate: patch.dueDate !== undefined ? patch.dueDate : current.due_date
      })
      return mapTask(getStmt.get(id) as TaskRow)
    },

    setStatus(id: number, status: TaskStatus): Task {
      setStatusStmt.run({ id, status, completedAt: status === 'done' ? new Date().toISOString() : null })
      return mapTask(getStmt.get(id) as TaskRow)
    },

    delete(id: number): void {
      deleteStmt.run(id)
    },

    countOpen(): number {
      return (countOpenStmt.get() as { n: number }).n
    }
  }
}

export type TasksRepository = ReturnType<typeof createTasksRepository>
