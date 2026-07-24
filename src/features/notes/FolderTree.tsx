import { useState } from 'react'
import { api } from '@/lib/api'
import type { NoteFolder } from '../../../electron/db/types'

interface FolderTreeProps {
  folders: NoteFolder[]
  selectedFolderId: number | undefined
  onSelectFolder: (id: number | undefined) => void
  onFoldersChanged: () => void
}

// Flat folder list for MVP — the schema supports nesting via parentId
// (ARCHITECTURE.md §4) but an expand/collapse tree UI isn't required by
// FR-4, so it's deferred until something actually needs nested folders.
export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onFoldersChanged
}: FolderTreeProps): JSX.Element {
  const [newFolderName, setNewFolderName] = useState('')

  async function handleCreateFolder(): Promise<void> {
    const name = newFolderName.trim()
    if (!name) return
    await api.notes.createFolder(name)
    setNewFolderName('')
    onFoldersChanged()
  }

  return (
    <aside className="w-48 shrink-0 border-r border-neutral-200 bg-white p-3">
      <button
        type="button"
        onClick={() => onSelectFolder(undefined)}
        className={`mb-2 w-full rounded px-2 py-1.5 text-left text-sm ${
          selectedFolderId === undefined ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
        }`}
      >
        All Notes
      </button>

      <ul className="space-y-0.5">
        {folders.map((folder) => (
          <li key={folder.id}>
            <button
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                selectedFolderId === folder.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
              }`}
            >
              {folder.name}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-1">
        <input
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleCreateFolder()}
          placeholder="New folder"
          className="w-full min-w-0 rounded border border-neutral-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={handleCreateFolder}
          className="shrink-0 rounded bg-neutral-900 px-2 text-xs text-white"
        >
          +
        </button>
      </div>
    </aside>
  )
}
