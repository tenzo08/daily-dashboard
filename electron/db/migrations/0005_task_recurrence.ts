// Lightweight recurrence for tasks — unlike schedule_items (RRULE,
// expanded into occurrences ahead of time), a recurring task just spawns
// its next copy when marked done. No occurrence table needed.
export const migration_0005_task_recurrence = `
ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT CHECK (recurrence_rule IN ('daily','weekly','monthly'));
`
