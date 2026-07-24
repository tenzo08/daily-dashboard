import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { NoteFolder, NoteSummary, Tag } from '../../../electron/db/types'
import { FolderTree } from './FolderTree'
import { NoteList } from './NoteList'
import { NoteEditor } from './NoteEditor'

export function NotesScreen(): JSX.Element {
  const [folders, setFolders] = useState<NoteFolder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined)
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)

  const refreshFolders = useCallback(async () => {
    setFolders(await api.notes.listFolders())
  }, [])

  const refreshTags = useCallback(async () => {
    setTags(await api.notes.listTags())
  }, [])

  const refreshNotes = useCallback(async () => {
    setNotes(await api.notes.listNotes({ folderId: selectedFolderId, tagId: selectedTagId }))
  }, [selectedFolderId, selectedTagId])

  useEffect(() => {
    refreshFolders()
    refreshTags()
  }, [refreshFolders, refreshTags])

  useEffect(() => {
    refreshNotes()
  }, [refreshNotes])

  async function handleCreateNote(): Promise<void> {
    const note = await api.notes.createNote({ title: 'Untitled', folderId: selectedFolderId })
    await refreshNotes()
    setSelectedNoteId(note.id)
  }

  return (
    <div className="flex h-full">
      <FolderTree
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={(id) => {
          setSelectedFolderId(id)
          setSelectedTagId(undefined)
        }}
        onFoldersChanged={refreshFolders}
      />
      <NoteList
        notes={notes}
        tags={tags}
        selectedTagId={selectedTagId}
        onSelectTag={setSelectedTagId}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onCreateNote={handleCreateNote}
      />
      {selectedNoteId ? (
        <NoteEditor
          key={selectedNoteId}
          noteId={selectedNoteId}
          onSaved={refreshNotes}
          onTagsChanged={refreshTags}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
          Select or create a note
        </div>
      )}
    </div>
  )
}
