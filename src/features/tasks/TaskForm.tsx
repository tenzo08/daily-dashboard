import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import type { NewTask, Task, TaskPriority } from '../../../electron/db/types'

interface TaskFormProps {
  initial: Task | null
  onSaved: () => void
  onCancel: () => void
  onDelete: () => void
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

export function TaskForm({ initial, onSaved, onCancel, onDelete }: TaskFormProps): JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const input: NewTask = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined
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
        className="w-96 rounded-panel border border-line bg-surface p-5"
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
