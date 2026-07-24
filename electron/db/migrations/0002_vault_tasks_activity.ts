// Adds the password vault, tasks, and activity log tables. Kept as a
// template-literal export (not a .sql file) for the same bundling reason as
// 0001_init.ts — see that file's comment.
export const migration_0002_vault_tasks_activity = `
CREATE TABLE credentials (
  id            INTEGER PRIMARY KEY,
  title         TEXT NOT NULL,
  username      TEXT,
  url           TEXT,
  folder        TEXT,
  secret_cipher TEXT NOT NULL,
  secret_iv     TEXT NOT NULL,
  secret_tag    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tasks (
  id           INTEGER PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date     TEXT,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE TABLE activity_log (
  id         INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
`
