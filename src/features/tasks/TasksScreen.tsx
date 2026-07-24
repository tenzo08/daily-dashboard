import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { StatusPill, type StatusPillTone } from '@/components/ui/StatusPill'
import type { Task, TaskPriority, TaskStatus } from '../../../electron/db/types'
import { TaskForm } from './TaskForm'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' }
]

const PRIORITY_TONE: Record<TaskPriority, StatusPillTone> = { high: 'danger', medium: 'warning', low: 'muted' }
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

function TaskCard({
  task,
  onAdvance,
  onEdit
}: {
  task: Task
  onAdvance: () => void
  onEdit: () => void
}): JSX.Element {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <button type="button" onClick={onEdit} className="text-left text-sm font-medium text-graphite hover:underline">
          {task.title}
        </button>
        <StatusPill tone={PRIORITY_TONE[task.priority]}>{task.priority}</StatusPill>
      </div>
      {task.description && <p className="mb-2 text-xs text-graphite-dim">{task.description}</p>}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tabular-nums text-graphite-dim">{task.dueDate ?? '—'}</span>
        <button
          type="button"
          onClick={onAdvance}
          className="rounded-control border border-line px-2 py-1 text-[11px] text-graphite-dim hover:bg-line/40"
        >
          {task.status === 'done' ? 'Reopen' : task.status === 'todo' ? 'Start' : 'Complete'}
        </button>
      </div>
    </div>
  )
}

export function TasksScreen(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(async () => {
    setTasks(await api.tasks.list())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleAdvance(task: Task): Promise<void> {
    await api.tasks.setStatus(task.id, NEXT_STATUS[task.status])
    refresh()
  }

  async function handleDelete(): Promise<void> {
    if (!editing) return
    await api.tasks.delete(editing.id)
    setShowForm(false)
    setEditing(null)
    refresh()
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-graphite">
          Tasks <span className="font-mono text-sm font-normal text-graphite-dim">· {tasks.filter((t) => t.status !== 'done').length} open</span>
        </h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright"
        >
          New task
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.status)
          return (
            <div key={column.status}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-dim">
                {column.label} <span className="font-mono">{columnTasks.length}</span>
              </h2>
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onAdvance={() => handleAdvance(task)}
                    onEdit={() => {
                      setEditing(task)
                      setShowForm(true)
                    }}
                  />
                ))}
                {columnTasks.length === 0 && <p className="text-xs text-graphite-dim">Nothing here.</p>}
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <TaskForm
          initial={editing}
          onSaved={() => {
            setShowForm(false)
            setEditing(null)
            refresh()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
