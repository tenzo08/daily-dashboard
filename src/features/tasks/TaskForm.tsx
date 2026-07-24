import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import type { NewTask, NoteSummary, ScheduleItem, Task, TaskPriority } from '../../../electron/db/types'

interface TaskFormProps {
  initial: Task | null
  onSaved: () => void
  onCancel: () => void
  onDelete: () => void
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']
const NONE = ''

export function TaskForm({ initial, onSaved, onCancel, onDelete }: TaskFormProps): JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [linkedNoteId, setLinkedNoteId] = useState<number | ''>(initial?.linkedNoteId ?? NONE)
  const [linkedScheduleItemId, setLinkedScheduleItemId] = useState<number | ''>(
    initial?.linkedScheduleItemId ?? NONE
  )
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.notes.listNotes({}).then(setNotes)
    api.schedule.listItems().then(setScheduleItems)
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const input: NewTask = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      linkedNoteId: linkedNoteId === NONE ? null : linkedNoteId,
      linkedScheduleItemId: linkedScheduleItemId === NONE ? null : linkedScheduleItemId
    }

    if (initial) {
      await api.tasks.update(initial.id, input)
    } else {
      await api.tasks.create(input)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void/40">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-96 overflow-auto rounded-panel border border-line bg-surface p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-graphite">{initial ? 'Edit task' : 'New task'}</h2>

        <div className="space-y-3">
          <label className="block text-xs text-graphite-dim">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              required
              className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
            />
          </label>

          <label className="block text-xs text-graphite-dim">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-graphite-dim">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm capitalize text-graphite focus:border-brass focus:outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-graphite-dim">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-graphite-dim">
              Linked note
              <select
                value={linkedNoteId}
                onChange={(event) => setLinkedNoteId(event.target.value ? Number(event.target.value) : NONE)}
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
              >
                <option value={NONE}>None</option>
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-graphite-dim">
              Linked event
              <select
                value={linkedScheduleItemId}
                onChange={(event) =>
                  setLinkedScheduleItemId(event.target.value ? Number(event.target.value) : NONE)
                }
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
              >
                <option value={NONE}>None</option>
                {scheduleItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            {initial && (
              <button type="button" onClick={onDelete} className="text-xs text-danger hover:underline">
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-control px-3 py-1.5 text-sm text-graphite-dim hover:bg-line/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
