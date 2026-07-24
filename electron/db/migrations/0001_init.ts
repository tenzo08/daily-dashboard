// Schema from ARCHITECTURE.md §4. Kept as a template-literal export (not a
// standalone .sql file) so it bundles as plain TypeScript — no Vite ?raw
// import or build-time asset copy step needed for main-process code.
export const migration_0001_init = `
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('cash','bank','credit','other')),
  initial_balance REAL NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'PHP',
  archived        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  kind  TEXT NOT NULL CHECK (kind IN ('expense','income')),
  color TEXT
);

CREATE TABLE budgets (
  category_id   INTEGER PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount  REAL NOT NULL,
  threshold_pct REAL NOT NULL DEFAULT 90,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
  id                  INTEGER PRIMARY KEY,
  account_id          INTEGER NOT NULL REFERENCES accounts(id),
  category_id         INTEGER REFERENCES categories(id),
  type                TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  amount              REAL NOT NULL,
  occurred_on         TEXT NOT NULL,
  note                TEXT,
  transfer_account_id INTEGER REFERENCES accounts(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_transactions_account_date ON transactions(account_id, occurred_on);
CREATE INDEX idx_transactions_category_date ON transactions(category_id, occurred_on);

CREATE TABLE note_folders (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  parent_id INTEGER REFERENCES note_folders(id)
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY,
  folder_id  INTEGER REFERENCES note_folders(id),
  title      TEXT NOT NULL,
  body_md    TEXT NOT NULL DEFAULT '',
  is_daily   INTEGER NOT NULL DEFAULT 0,
  note_date  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_notes_daily_date ON notes(note_date) WHERE is_daily = 1;

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE schedule_items (
  id                      INTEGER PRIMARY KEY,
  title                   TEXT NOT NULL,
  description             TEXT,
  start_at                TEXT NOT NULL,
  end_at                  TEXT,
  all_day                 INTEGER NOT NULL DEFAULT 0,
  recurrence_rule         TEXT,
  recurrence_end_at       TEXT,
  reminder_minutes_before INTEGER,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE schedule_completions (
  schedule_item_id INTEGER NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  occurrence_date  TEXT NOT NULL,
  completed_at     TEXT,
  skipped          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (schedule_item_id, occurrence_date)
);

CREATE TABLE reminders_fired (
  schedule_item_id INTEGER NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  occurrence_at    TEXT NOT NULL,
  fired_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (schedule_item_id, occurrence_at)
);
`
