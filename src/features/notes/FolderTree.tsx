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
    <aside className="w-48 shrink-0 border-r border-line bg-surface p-3">
      <button
        type="button"
        onClick={() => onSelectFolder(undefined)}
        className={`mb-2 w-full rounded-control px-2 py-1.5 text-left text-sm ${
          selectedFolderId === undefined ? 'bg-brass-tint font-medium text-graphite' : 'text-graphite-dim hover:bg-line/40'
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
              className={`w-full truncate rounded-control px-2 py-1.5 text-left text-sm ${
                selectedFolderId === folder.id
                  ? 'bg-brass-tint font-medium text-graphite'
                  : 'text-graphite-dim hover:bg-line/40'
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
          className="w-full min-w-0 rounded-control border border-line bg-paper px-2 py-1 text-xs text-graphite focus:border-brass focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCreateFolder}
          className="shrink-0 rounded-control bg-brass px-2 text-xs font-semibold text-graphite hover:bg-brass-bright"
        >
          +
        </button>
      </div>
    </aside>
  )
}
