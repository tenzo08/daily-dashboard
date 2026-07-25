import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { StatusPill, type StatusPillTone } from '@/components/ui/StatusPill'
import type { NoteSummary, ScheduleItem, Task, TaskPriority, TaskStatus } from '../../../electron/db/types'
import { TaskForm } from './TaskForm'

const SECTIONS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' }
]

const PRIORITY_TONE: Record<TaskPriority, StatusPillTone> = { high: 'danger', medium: 'warning', low: 'muted' }
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

function TaskRow({
  task,
  linkedNoteTitle,
  linkedScheduleTitle,
  onAdvance,
  onEdit,
  onOpenNote,
  onOpenSchedule
}: {
  task: Task
  linkedNoteTitle: string | undefined
  linkedScheduleTitle: string | undefined
  onAdvance: () => void
  onEdit: () => void
  onOpenNote: () => void
  onOpenSchedule: () => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5">
      <button
        type="button"
        onClick={onAdvance}
        aria-label={task.status === 'done' ? 'Reopen' : task.status === 'todo' ? 'Start' : 'Complete'}
        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
          task.status === 'done' ? 'border-success bg-success' : 'border-line hover:border-brass'
        }`}
      />

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-sm font-medium ${task.status === 'done' ? 'text-graphite-dim line-through' : 'text-graphite'}`}>
          {task.title}
        </span>
        {task.description && <span className="block truncate text-xs text-graphite-dim">{task.description}</span>}
      </button>

      {(linkedNoteTitle || linkedScheduleTitle) && (
        <div className="flex shrink-0 gap-1.5">
          {linkedNoteTitle && (
            <button
              type="button"
              onClick={onOpenNote}
              className="max-w-32 truncate rounded-pill bg-muted-tint px-2 py-0.5 text-[11px] text-muted hover:text-graphite"
            >
              📄 {linkedNoteTitle}
            </button>
          )}
          {linkedScheduleTitle && (
            <button
              type="button"
              onClick={onOpenSchedule}
              className="max-w-32 truncate rounded-pill bg-muted-tint px-2 py-0.5 text-[11px] text-muted hover:text-graphite"
            >
              📅 {linkedScheduleTitle}
            </button>
          )}
        </div>
      )}

      <StatusPill tone={PRIORITY_TONE[task.priority]}>{task.priority}</StatusPill>
      <span className="w-24 shrink-0 whitespace-nowrap text-right font-mono text-[11px] tabular-nums text-graphite-dim">
        {task.dueDate ?? '—'}
      </span>
    </div>
  )
}

interface TasksScreenProps {
  /** Set by the command palette (Ctrl+K) to deep-link straight to a task. */
  initialTaskId?: number
  onConsumedInitialSelection?: () => void
  onOpenNote: (noteId: number) => void
  onOpenSchedule: () => void
}

export function TasksScreen({
  initialTaskId,
  onConsumedInitialSelection,
  onOpenNote,
  onOpenSchedule
}: TasksScreenProps): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [editing, setEditing] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)
  const consumedIdRef = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const [taskList, noteList, itemList] = await Promise.all([
      api.tasks.list(),
      api.notes.listNotes({}),
      api.schedule.listItems()
    ])
    setTasks(taskList)
    setNotes(noteList)
    setScheduleItems(itemList)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (initialTaskId === undefined || consumedIdRef.current === initialTaskId) return
    const task = tasks.find((t) => t.id === initialTaskId)
    if (task) {
      setEditing(task)
      setShowForm(true)
      consumedIdRef.current = initialTaskId
      onConsumedInitialSelection?.()
    }
  }, [initialTaskId, tasks, onConsumedInitialSelection])

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

  const noteTitleById = new Map(notes.map((n) => [n.id, n.title]))
  const scheduleTitleById = new Map(scheduleItems.map((s) => [s.id, s.title]))

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

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const rows = tasks.filter((t) => t.status === section.status)
          return (
            <section key={section.status}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-dim">
                {section.label} <span className="font-mono">{rows.length}</span>
              </h2>
              <div className="space-y-1.5">
                {rows.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    linkedNoteTitle={task.linkedNoteId !== null ? noteTitleById.get(task.linkedNoteId) : undefined}
                    linkedScheduleTitle={
                      task.linkedScheduleItemId !== null ? scheduleTitleById.get(task.linkedScheduleItemId) : undefined
                    }
                    onAdvance={() => handleAdvance(task)}
                    onEdit={() => {
                      setEditing(task)
                      setShowForm(true)
                    }}
                    onOpenNote={() => task.linkedNoteId !== null && onOpenNote(task.linkedNoteId)}
                    onOpenSchedule={onOpenSchedule}
                  />
                ))}
                {rows.length === 0 && <p className="px-1 text-xs text-graphite-dim">Nothing here.</p>}
              </div>
            </section>
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
