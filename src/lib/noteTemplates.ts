export interface NoteTemplate {
  key: string
  label: string
  title: string
  bodyMd: string
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  { key: 'blank', label: 'Blank', title: 'Untitled', bodyMd: '' },
  {
    key: 'daily-journal',
    label: 'Daily Journal',
    title: 'Daily Journal',
    bodyMd: "## Today's focus\n\n\n## Notes\n\n\n## Tomorrow\n"
  },
  {
    key: 'meeting-notes',
    label: 'Meeting Notes',
    title: 'Meeting Notes',
    bodyMd: '**Attendees:** \n\n## Agenda\n\n## Notes\n\n## Action items\n- [ ] '
  },
  {
    key: '1-1',
    label: '1:1 Notes',
    title: '1:1 Notes',
    bodyMd: '## Discussion\n\n## Action items\n- [ ] \n\n## Follow-up\n'
  }
]
