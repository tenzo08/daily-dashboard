import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { NoteFolder, NoteSummary, Tag } from '../../../electron/db/types'
import { FolderTree } from './FolderTree'
import { NoteList } from './NoteList'
import { NoteEditor } from './NoteEditor'

interface NotesScreenProps {
  /** Set by the command palette (Ctrl+K) to deep-link straight to a note. */
  initialNoteId?: number
  onOpenTask: (taskId: number) => void
}

export function NotesScreen({ initialNoteId, onOpenTask }: NotesScreenProps): JSX.Element {
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

  useEffect(() => {
    if (initialNoteId !== undefined) setSelectedNoteId(initialNoteId)
  }, [initialNoteId])

  async function handleCreateNote(): Promise<void> {
    const note = await api.notes.createNote({ title: 'Untitled', folderId: selectedFolderId })
    await refreshNotes()
    setSelectedNoteId(note.id)
  }

  return (
    <div className="flex h-full flex-1">
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
          onOpenTask={onOpenTask}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-graphite-dim">
          Select or create a note
        </div>
      )}
    </div>
  )
}
