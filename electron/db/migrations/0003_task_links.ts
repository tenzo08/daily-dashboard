// Lets a task optionally reference the note or schedule item it came from
// — the "link notes ↔ tasks ↔ schedule" feature. Nullable, ON DELETE SET
// NULL so removing the linked note/event doesn't take the task with it.
export const migration_0003_task_links = `
ALTER TABLE tasks ADD COLUMN linked_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN linked_schedule_item_id INTEGER REFERENCES schedule_items(id) ON DELETE SET NULL;
`
