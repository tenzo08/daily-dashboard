# Daily Dashboard — Architecture Design

Status: Draft from `/sc:design` (2026-07-24), based on `REQUIREMENTS.md`; sections 3/4/6/8/9 updated 2026-07-25 to match the implementation after the password vault, tasks, activity log, tray quick-actions, note templates, and export/CSV features shipped.
Next step: `/sc:implement` per component, or `/sc:workflow` to sequence the build.

## 1. Confirmed Stack Decisions

| Decision | Choice | Why |
|---|---|---|
| Desktop shell | Electron (main + renderer + preload) | Windows desktop, Task Scheduler + system tray + native notifications all need Node/OS access from a main process |
| Frontend | React + TypeScript + Tailwind, bundled via Vite (`electron-vite`) | Mainstream ecosystem, fast dev loop, good fit for dashboard/calendar/chart components |
| Local database | SQLite via `better-sqlite3` | Relational queries needed for budget reports and recurring-event/reminder lookups; single portable file |
| Background persistence | App stays alive in system tray after the window is closed; Task Scheduler launch reuses the existing instance if already running | Resolves OQ-6 — reminders (FR-11) must fire all day, not just at the one daily launch |
| Recurrence engine | `rrule.js` (iCal RRULE strings) | Don't hand-roll recurrence math; well-tested, covers daily/weekly/monthly/custom patterns (FR-10) |
| Packaging | `electron-builder`, NSIS installer | Standard Windows installer output; needed to get a stable install path for Task Scheduler to target |

## 2. Process Architecture

```mermaid
graph TB
    subgraph Main Process (Node, has OS access)
        M[main.ts entrypoint]
        DB[(SQLite via better-sqlite3)]
        IPC[ipcMain handlers, grouped by domain]
        SCHED[Windows Task Scheduler bridge<br/>schtasks XML register/update]
        REM[Reminder loop<br/>polls due occurrences, fires toast]
        TRAY[Tray icon + menu]
        LOCK[PIN hash/verify - scrypt]
        M --> DB
        M --> IPC
        M --> SCHED
        M --> REM
        M --> TRAY
        M --> LOCK
        IPC --> DB
        REM --> DB
    end

    subgraph Preload (contextBridge, isolated)
        P[preload.ts<br/>exposes window.api.*]
    end

    subgraph Renderer Process (Chromium, no Node access)
        R[React app]
        LOCKUI[Lock screen]
        TODAY[Today dashboard]
        NOTES[Notes feature]
        SCH[Schedule feature]
        BUD[Budget feature]
        SET[Settings]
        R --> LOCKUI
        R --> TODAY
        R --> NOTES
        R --> SCH
        R --> BUD
        R --> SET
    end

    R -- window.api calls --> P
    P -- ipcRenderer.invoke --> IPC
    IPC -- ipcMain.handle replies --> P
    REM -- Notification API --> WinToast[Windows Toast]
    SCHED -- schtasks.exe --> TaskSched[Windows Task Scheduler]
    TaskSched -- launches at set time --> M
```

**Security boundary**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on the renderer. The renderer never touches `fs`/`node:sqlite` directly — every DB read/write goes through `ipcMain.handle` in the main process via the typed `window.api` surface exposed by preload. This is non-negotiable even for a single-user local app: it keeps a compromised renderer (e.g. from a malformed note pasted as HTML) from getting arbitrary file-system access.

## 3. Directory Layout

```
daily-dashboard/
  electron/                      # main process (Node)
    main.ts                      # app lifecycle, window + tray creation, single-instance lock, dev/prod userData split
    preload.ts                   # contextBridge exposure of window.api
    db/
      index.ts                   # connection, PRAGMA setup (WAL, foreign_keys=ON)
      migrations/
        0001_init.ts                       # accounts/categories/budgets/transactions, notes/folders/tags, schedule
        0002_vault_tasks_activity.ts        # credentials (password vault), tasks, activity_log
        0003_task_links.ts                  # tasks.linked_note_id / linked_schedule_item_id
        0004_credential_health.ts           # credentials.secret_updated_at (vault health check)
        0005_task_recurrence.ts             # tasks.recurrence_rule (daily/weekly/monthly)
      repositories/
        accounts.ts  transactions.ts  categories.ts  budgets.ts
        notes.ts  folders.ts  tags.ts
        schedule.ts  settings.ts  credentials.ts  tasks.ts  activityLog.ts
      seed.ts                     # dev-only: `npm run db:seed` populates the dev DB with sample data
    ipc/
      accounts.ipc.ts  transactions.ipc.ts  notes.ipc.ts  schedule.ipc.ts
      settings.ipc.ts  dashboard.ipc.ts  auth.ipc.ts  credentials.ipc.ts
      tasks.ipc.ts  activity.ipc.ts  backup.ipc.ts  system.ipc.ts
    scheduler/
      taskSchedulerBridge.ts      # generates Task Scheduler XML, registers/updates via schtasks.exe
      reminderLoop.ts             # periodic due-occurrence scan -> Notification
    tray/
      tray.ts                    # tray menu incl. New Task / New Note quick-actions (gated on vault unlock)
    lock/
      auth.ts                    # scrypt hash/verify, lockout backoff
      vaultCrypto.ts              # Argon2id key derivation + AES secret encryption for the password vault
      vaultSession.ts             # holds the derived vault key in memory only while unlocked
  src/                            # renderer (React)
    main.tsx  App.tsx
    features/
      lock/  dashboard/  notes/  schedule/  budget/  settings/  tasks/  tools/ (vault + activity log)
    state/                        # zustand stores per feature
    lib/
      rruleHelpers.ts  api.ts     # typed wrapper around window.api
  resources/                      # icons, tray icon, installer assets
  electron-builder.yml
  package.json
  REQUIREMENTS.md
  ARCHITECTURE.md
```

Data file location at runtime: `app.getPath('userData')/data.db`. **Dev and packaged builds intentionally use separate directories** so dev-time seed/sample data never ships inside the built `.exe`:
- Dev (`npm run dev`, and `npm run db:seed`): `%APPDATA%/daily-dashboard-dev/data.db` (main.ts overrides `userData` to this path whenever `!app.isPackaged`)
- Packaged (`npm run build:win` output, the installed app): `%APPDATA%/daily-dashboard/data.db` — always starts empty on a fresh machine

Both survive app updates since `userData` is outside the install directory.

## 4. Data Model (SQLite)

```mermaid
erDiagram
    ACCOUNTS ||--o{ TRANSACTIONS : "holds"
    CATEGORIES ||--o{ TRANSACTIONS : "classifies"
    CATEGORIES ||--o| BUDGETS : "has limit"
    NOTE_FOLDERS ||--o{ NOTES : "contains"
    NOTES ||--o{ NOTE_TAGS : "tagged via"
    TAGS ||--o{ NOTE_TAGS : "applied to"
    SCHEDULE_ITEMS ||--o{ SCHEDULE_COMPLETIONS : "tracks per-occurrence"
    SCHEDULE_ITEMS ||--o{ REMINDERS_FIRED : "dedupes"
```

```sql
-- 0001_init.sql

CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- keys used: launch_time ('07:30'), pin_hash, pin_salt,
-- lock_failed_attempts, lock_locked_until, default_currency,
-- vault_kdf_salt (Argon2id salt for the vault encryption key),
-- idle_lock_minutes, activity_retention_days

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
  id                 INTEGER PRIMARY KEY,
  account_id         INTEGER NOT NULL REFERENCES accounts(id),
  category_id        INTEGER REFERENCES categories(id),
  type               TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  amount              REAL NOT NULL,
  occurred_on        TEXT NOT NULL,          -- 'YYYY-MM-DD'
  note               TEXT,
  transfer_account_id INTEGER REFERENCES accounts(id),
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
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
  body_md    TEXT NOT NULL DEFAULT '',   -- Markdown source (portable, diff/export-friendly)
  is_daily   INTEGER NOT NULL DEFAULT 0,
  note_date  TEXT,                        -- 'YYYY-MM-DD', set only when is_daily=1
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
  start_at                TEXT NOT NULL,   -- ISO datetime, first occurrence
  end_at                  TEXT,
  all_day                 INTEGER NOT NULL DEFAULT 0,
  recurrence_rule         TEXT,            -- RRULE string, NULL = one-off
  recurrence_end_at       TEXT,
  reminder_minutes_before INTEGER,         -- NULL = no reminder
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recurring items are expanded on the fly via rrule.js; only exceptions/
-- completions are persisted, per occurrence date.
CREATE TABLE schedule_completions (
  schedule_item_id INTEGER NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  occurrence_date  TEXT NOT NULL,   -- 'YYYY-MM-DD'
  completed_at     TEXT,
  skipped          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (schedule_item_id, occurrence_date)
);

-- Dedupes toast notifications across app restarts within the same day
CREATE TABLE reminders_fired (
  schedule_item_id INTEGER NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  occurrence_at    TEXT NOT NULL,   -- ISO datetime of the specific occurrence
  fired_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (schedule_item_id, occurrence_at)
);

-- 0002_vault_tasks_activity.sql — added after MVP to cover the "Accounts"
-- lock screen growing into a full password vault, plus a task list and an
-- audit trail of what happened when.

CREATE TABLE credentials (
  id            INTEGER PRIMARY KEY,
  title         TEXT NOT NULL,
  username      TEXT,
  url           TEXT,
  folder        TEXT,
  secret_cipher TEXT NOT NULL,      -- AES-GCM ciphertext of {password, notes}
  secret_iv     TEXT NOT NULL,
  secret_tag    TEXT NOT NULL,
  secret_updated_at TEXT,           -- 0004: only bumped on an actual password change, not a rename
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
  linked_note_id           INTEGER REFERENCES notes(id) ON DELETE SET NULL,           -- 0003
  linked_schedule_item_id  INTEGER REFERENCES schedule_items(id) ON DELETE SET NULL,  -- 0003
  recurrence_rule TEXT CHECK (recurrence_rule IN ('daily','weekly','monthly')),        -- 0005
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
```

Design notes:
- **Budgets are a standing limit per category** (FR-15), not per-month rows — matches "set a monthly budget for Food" as an ongoing rule. Spend-to-date is computed by summing `transactions` for the current month, not stored redundantly.
- **Recurring schedule items are never materialized into rows per occurrence.** `rrule.js` expands `recurrence_rule` against a date range at query time (for the daily list and calendar view); only completions and reminder-fired state are persisted, keyed by occurrence date. This avoids a growing table and keeps edits to the recurrence rule (e.g. changing time) apply retroactively/going-forward correctly.
- **Notes store Markdown**, not HTML/JSON, so data stays plain-text-portable (readable outside the app, diffable, easy to hand-export later per OQ-2/OQ-8) while still supporting FR-7's bold/lists/checkboxes via standard Markdown syntax (`- [ ]` for checkboxes).
- **The password vault encrypts only the secret** (`credentials.secret_cipher/iv/tag`, AES-GCM), not the whole database. The AES key is derived from the app PIN via Argon2id (`lock/vaultCrypto.ts`) and lives only in memory (`lock/vaultSession.ts`) while unlocked — nothing sensitive is ever written to disk in plaintext, but titles/usernames/URLs stay unencrypted in SQLite since they're needed for list/search without unlocking. Changing the PIN re-derives the key and re-encrypts every credential (`auth.ipc.ts`'s `auth:setPin`).
- **Recurring tasks don't use an occurrence table like schedule items do.** Marking a recurring task done just spawns its next copy from `recurrence_rule` — no lookahead expansion needed since only one "next" instance is ever pending at a time.

## 5. Key Flows

### 5.1 Daily auto-launch, single instance, lock

```mermaid
sequenceDiagram
    participant TS as Task Scheduler
    participant Main as Main Process
    participant Tray as Tray (if already running)
    participant Renderer as Renderer (React)

    TS->>Main: launches exe at configured time
    alt already running (single-instance lock held)
        Main->>Tray: 'second-instance' event
        Tray->>Main: restore + focus existing window
    else not running
        Main->>Main: open SQLite, run pending migrations
        Main->>Main: create BrowserWindow (hidden until ready)
    end
    Main->>Renderer: load app, show Lock screen
    Renderer->>Main: window.api.auth.verifyPin(pin)
    Main-->>Renderer: ok / fail (+ backoff after N failures)
    Renderer->>Main: window.api.notes.getOrCreateDailyNote()
    Main-->>Renderer: today's daily note (created if missing)
    Renderer->>Renderer: render Today Dashboard
```

- Enforced via `app.requestSingleInstanceLock()`; a second launch (Task Scheduler firing while the tray instance is already alive) never spawns a duplicate process — it just focuses the existing window. This is what makes "stays in the tray all day" and "auto-launches every morning" compatible.
- Closing the window (`X` button) is intercepted (`event.preventDefault()` in the `close` handler) and hides the window instead of quitting, unless the user picks **Quit** from the tray menu (which sets an `isQuitting` flag main checks in that handler).

### 5.2 Reminder loop (background, tray-resident)

- A `setInterval` in the main process (e.g. every 30s) asks: "which schedule occurrences (materialized via `rrule.js` for a lookahead window, e.g. next 24h) have `reminder_minutes_before` before now, and are not yet in `reminders_fired`?"
- For each due occurrence: fire `new Notification({...})` (Electron's native Notification, which renders as a Windows toast), then insert into `reminders_fired`.
- This runs independent of whether a window is open — only requires the main process to be alive, which the tray-persistence decision (3a) guarantees during the day.

### 5.3 Task Scheduler registration/update

- On first successful run (after PIN is set in onboarding) and whenever the user changes the launch time in Settings, the main process regenerates a Task Scheduler XML definition and registers it via `schtasks /Create /TN "DailyDashboard" /XML <tmpfile> /F`.
- The generated XML sets `<StartWhenAvailable>true</StartWhenAvailable>` — this resolves OQ-5: if the PC is off/asleep at the scheduled time, Windows runs the task as soon as possible after it becomes available, rather than silently skipping the day. (This flag isn't reachable through the simple `schtasks /Create /SC DAILY` flags — it requires the XML task definition form.)
- The task's action target is the installed `.exe` path (`process.execPath` in a packaged app), so this must be (re)registered after install/update if the path changes — `electron-builder`'s NSIS output keeps a stable install path across versions, so this only needs to happen once unless the user moves the install.

### 5.4 Tray quick-actions (New Task / New Note)

- The tray context menu (`tray/tray.ts`) offers **New Task** and **New Note** without requiring the main window to be focused (or even visible).
- Both check `vaultSession.get()` first — the same in-memory flag that gates the password vault — since quick-capture writing data behind a locked screen would defeat the lock. If locked, the click just shows the window (the lock screen); if unlocked, it creates the row directly via the repository, logs it to `activity_log`, shows the window, and sends a `tray:quickAction` renderer event so the UI can navigate straight to the new item.

## 6. IPC Contract (`window.api`)

Exposed by `preload.ts` via `contextBridge.exposeInMainWorld('api', {...})`; every method is `ipcRenderer.invoke` under the hood, handled by `ipcMain.handle` in the matching `electron/ipc/*.ts` file. This is the only channel the renderer has to reach data — listed here as the interface contract, not implementation.

```ts
window.api = {
  auth: {
    isPinSet(): Promise<boolean>;
    setPin(pin: string): Promise<void>;             // also derives/re-keys the vault key (see §4 design notes)
    verifyPin(pin: string): Promise<{ ok: boolean; lockedUntil?: string }>;
    lock(): Promise<void>;                           // drops the in-memory vault key without closing the window
    resetData(): Promise<void>;                       // OQ-1: wipes the local DB file and relaunches onboarding
  };
  accounts: {
    list(includeArchived?: boolean): Promise<Account[]>;
    create(input: NewAccount): Promise<Account>;
    update(id: number, patch: Partial<NewAccount>): Promise<Account>;
    archive(id: number): Promise<void>;
    getBalances(): Promise<AccountBalance[]>;
  };
  transactions: {
    list(filter: { accountId?: number; categoryId?: number; from?: string; to?: string }): Promise<Transaction[]>;
    create(input: NewTransaction): Promise<Transaction>;
    update(id: number, patch: Partial<NewTransaction>): Promise<Transaction>;
    delete(id: number): Promise<void>;
  };
  categories: {
    list(): Promise<Category[]>;
    create(input: NewCategory): Promise<Category>;
  };
  budgets: {
    list(): Promise<BudgetWithSpend[]>;   // includes month-to-date spend, computed
    set(categoryId: number, limitAmount: number, thresholdPct?: number): Promise<void>;
  };
  notes: {
    listFolders(): Promise<NoteFolder[]>;
    createFolder(name: string, parentId?: number): Promise<NoteFolder>;
    listNotes(filter: { folderId?: number; tagId?: number }): Promise<NoteSummary[]>;
    getNote(id: number): Promise<Note>;
    createNote(input: NewNote): Promise<Note>;         // used by note templates (Daily Journal, Meeting Notes, 1:1, Blank) and tray "New Note"
    saveNote(id: number, patch: { title?: string; bodyMd?: string; folderId?: number }): Promise<Note>;
    delete(id: number): Promise<void>;
    getOrCreateDailyNote(): Promise<Note>;
    listTags(): Promise<Tag[]>;
    tagsForNote(noteId: number): Promise<Tag[]>;
    addTagToNote(noteId: number, tagName: string): Promise<void>;
    removeTagFromNote(noteId: number, tagId: number): Promise<void>;
  };
  schedule: {
    listOccurrences(rangeStartISO: string, rangeEndISO: string): Promise<ScheduleOccurrence[]>;
    listItems(): Promise<ScheduleItem[]>;
    getItem(id: number): Promise<ScheduleItem>;
    createItem(input: NewScheduleItem): Promise<ScheduleItem>;
    updateItem(id: number, patch: Partial<NewScheduleItem>): Promise<ScheduleItem>;
    deleteItem(id: number): Promise<void>;
    toggleCompletion(itemId: number, occurrenceDate: string): Promise<void>;
  };
  tasks: {
    list(filter?: TaskFilter): Promise<Task[]>;
    create(input: NewTask): Promise<Task>;              // linkable to a note/schedule item; recurrence_rule optional
    update(id: number, patch: Partial<NewTask>): Promise<Task>;
    setStatus(id: number, status: TaskStatus): Promise<void>;  // marking a recurring task 'done' spawns its next copy
    delete(id: number): Promise<void>;
  };
  credentials: {
    // The password vault. Every method except list/create/update/delete
    // operates on already-encrypted rows — the plaintext secret only ever
    // exists in the renderer after an explicit reveal() call.
    list(): Promise<CredentialSummary[]>;                // titles/usernames/URLs only, no secrets
    create(input: NewCredentialInput): Promise<CredentialSummary>;
    update(id: number, patch: Partial<NewCredentialInput>): Promise<CredentialSummary>;
    delete(id: number): Promise<void>;
    reveal(id: number): Promise<CredentialSecret>;        // decrypts using the in-memory vault key; throws if locked
    health(): Promise<CredentialHealthEntry[]>;            // weak/reused/old-password flags
  };
  activity: {
    list(limit?: number): Promise<ActivityLogEntry[]>;     // pruned on startup per settings.activityRetentionDays
  };
  backup: {
    export(): Promise<{ filePath: string }>;               // full JSON export via a native save dialog
    import(): Promise<{ ok: boolean }>;                    // restores from a previously exported JSON file
    exportTransactionsCsv(): Promise<{ filePath: string }>; // CSV export of the transaction ledger
  };
  system: {
    copyToClipboard(text: string): Promise<void>;           // used for one-click credential/password copy
  };
  settings: {
    getLaunchTime(): Promise<string>;
    setLaunchTime(time: string): Promise<void>;   // also re-registers Task Scheduler entry
    getIdleLockMinutes(): Promise<number>;
    setIdleLockMinutes(minutes: number): Promise<void>;
    getActivityRetentionDays(): Promise<number>;
    setActivityRetentionDays(days: number): Promise<void>;
  };
  dashboard: {
    getToday(): Promise<{
      note: Note;
      schedule: ScheduleOccurrence[];
      budgetSnapshot: { accountBalances: AccountBalance[]; monthSpendByCategory: CategorySpend[] };
    }>;
  };
};
```

## 7. Non-Functional Requirements — How the Design Satisfies Them

| NFR | Design answer |
|---|---|
| NFR-1 Offline-first | No network calls anywhere in the design; all IPC stays within the local process pair |
| NFR-2 Local persistence | SQLite file in `userData`, WAL mode for crash-safety; versioned migrations in `db/migrations`. Dev and packaged builds use separate `userData` directories (`daily-dashboard-dev` vs `daily-dashboard`) so dev-only seed/sample data never appears in a built `.exe` — see §3 |
| NFR-3 Startup performance | Vite-bundled renderer (small JS payload), `better-sqlite3` is synchronous/fast for this data volume, window created hidden and shown on `ready-to-show` to avoid a blank-white flash |
| NFR-4 Single-machine | No sync layer designed; nothing in the schema assumes multi-device merge |
| NFR-5 Windows-only | `schtasks.exe` bridge and Electron `Notification` (Windows toast backend) are both Windows-native; no cross-platform abstraction added |
| NFR-6 Data privacy | PIN stored as `scrypt(pin, salt)`, never plaintext; failed-attempt backoff in `lock/auth.ts`. Password-vault secrets are separately encrypted at the field level with an Argon2id-derived AES key (§4 design notes). Whole-DB-at-rest encryption (e.g. SQLCipher) is **not** included — everything else (notes, tasks, transactions) stays plaintext in SQLite, flagged as a remaining hardening option below |

## 8. Open Items Status (from REQUIREMENTS.md §5)

| # | Question | Status |
|---|---|---|
| OQ-1 | PIN recovery if forgotten | **Resolved** — no recovery path; `auth:resetData` (`auth.ipc.ts`) wipes the local DB file and relaunches onboarding instead, the tradeoff the requirements doc flagged as acceptable for local-only simplicity |
| OQ-2 | Backup/export | **Resolved** — `backup.ipc.ts` provides a full JSON export/import (Settings → Export/Restore) plus a dedicated transaction-ledger CSV export |
| OQ-3 | Multi-currency | **Still open** — schema has a `currency` column per account (cheap to include now) but no conversion/aggregation logic across currencies designed; assume single-currency reporting for MVP unless clarified |
| OQ-4 | Task Scheduler setup UX | **Resolved** — §5.3, auto-registered on first run + re-registered on settings change |
| OQ-5 | Missed launch while PC is off | **Resolved** — §5.3, `StartWhenAvailable` in the XML task definition |
| OQ-6 | Notifications require app running | **Resolved** — tray-persistence decision (§1, §5.2) |
| OQ-7 | Rich text scope | **Resolved for MVP** — Markdown subset (bold/italic/lists/checkboxes), no embedded images; editor component choice deferred to implementation |
| OQ-8 | Budget report export | **Resolved** — same mechanism as OQ-2; CSV export of the transaction ledger covers the "records/taxes" use case, on-screen charting (Reports' month-over-month insights) covers analysis |

## 9. Explicitly Not Designed Here

- DB-at-rest encryption for non-vault data (SQLCipher or similar) — not requested, flagged as a hardening option; only password-vault secrets are field-level encrypted today (§4, NFR-6)
- Auto-update mechanism for the app itself — out of scope unless raised
- Multi-currency conversion/aggregation (OQ-3) — schema allows per-account currency but no conversion logic exists
