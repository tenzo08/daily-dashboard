# Daily Dashboard — Requirements Specification

Status: Draft from `/sc:brainstorm` discovery session (2026-07-24)
Next step: `/sc:design` for architecture, or `/sc:workflow` for implementation planning.

## 1. Clarified Goal

A Windows desktop Electron app that acts as an **all-in-one personal daily hub** — accounts (financial + a lightweight local lock), notes, schedule, and a manual budget tracker — for a **single user on a single machine**. The app **auto-launches daily at a configured time** via Windows Task Scheduler, opening straight to a "Today" dashboard that surfaces the day's schedule, notes, and budget snapshot in one view.

All data is stored **locally only** (file/embedded DB) — no cloud sync, no external accounts.

## 2. Functional Requirements

### 2.1 App Access / "Accounts"
- FR-1: The app has a simple local PIN or password lock screen gating access to the app on launch.
- FR-2: This is an app-level lock only — not a multi-user account system, and not dependent on Windows login.
- FR-3: "Accounts" in the budgeting sense (below) are financial accounts, unrelated to app-access accounts — naming should disambiguate these two concepts (e.g. "App Lock" vs "Financial Accounts") to avoid confusion in UI and data model.

### 2.2 Notes
- FR-4: Notes are organized into folders/notebooks (user-defined grouping).
- FR-5: Notes support tags as a cross-cutting, filterable label system independent of folder placement.
- FR-6: Each daily launch auto-creates a dated note tied to that day (a "daily note"), pre-linked into the Today dashboard.
- FR-7: Notes support rich text formatting — at minimum bold/italic, lists, and checkboxes (task-style lines within a note).

### 2.3 Schedule
- FR-8: A simple daily task/event list is the primary view — checkable off, no calendar grid required for MVP.
- FR-9: A full calendar view (month/week grid) is also required, in addition to the daily list.
- FR-10: Recurring events are supported (daily/weekly/custom repeat) without needing re-entry each occurrence.
- FR-11: Reminders/notifications are delivered via Windows toast notifications at scheduled event times.

### 2.4 Budget Tracker (manual entry)
- FR-12: Supports multiple financial accounts (e.g. cash, bank, credit card), each with a running balance updated by manual transaction entry.
- FR-13: Transactions are categorized/tagged (e.g. food, rent, transport) to enable spend breakdowns.
- FR-14: Reports/charts summarize spend — at minimum monthly-by-category and trend-over-time views.
- FR-15: Users can set monthly budgets/limits per category and receive an in-app warning when spend approaches or exceeds the limit.
- FR-16: All entry is manual — no bank/API integration.

### 2.5 Daily Auto-Launch
- FR-17: The app auto-launches at a user-configured daily time via Windows Task Scheduler (setup/registration of the scheduled task is part of the app's responsibility, e.g. on first run or in settings).
- FR-18: On launch, the app opens directly to a "Today" dashboard combining: today's schedule items, the auto-created daily note, and a budget snapshot (e.g. balances + today's/month's spend so far).
- FR-19: The lock screen (FR-1) is shown before the Today dashboard is accessible, even on auto-launch.

## 3. Non-Functional Requirements

- NFR-1: **Offline-first / local-only** — no network dependency for core functionality; no cloud account required.
- NFR-2: **Data persistence** — local file-based storage (e.g. SQLite or embedded DB) surviving app restarts and OS reboots; no automatic cloud backup (manual export was considered but not selected — see Open Questions).
- NFR-3: **Startup performance** — since the app opens unattended via Task Scheduler each day, cold-start-to-dashboard time should be fast enough not to feel broken if the user glances at it shortly after the scheduled time.
- NFR-4: **Single-machine scope** — no multi-device sync; explicitly out of scope per user decision.
- NFR-5: **Windows-only** — Task Scheduler integration is Windows-specific; no cross-platform requirement stated.
- NFR-6: **Data privacy** — since financial data is stored locally with only a PIN/password gate, the lock mechanism should be reasonably resistant to casual bypass (exact strength TBD — see Open Questions).

## 4. User Stories / Acceptance Criteria

**US-1**: As the user, I want the app to open automatically every morning at my chosen time, so I don't have to remember to launch it.
- AC: A Windows scheduled task is created/managed by the app; at the configured time the app process starts and, once the lock is passed, shows the Today dashboard within a few seconds.

**US-2**: As the user, I want to unlock the app with a PIN/password, so my financial and personal data isn't visible to anyone who touches my PC.
- AC: On every launch (auto or manual), a lock screen blocks all content until the correct PIN/password is entered. Incorrect entry does not reveal any app data.

**US-3**: As the user, I want a dated note auto-created each day, so I have a running daily journal without manual setup.
- AC: On the first app open of a calendar day, a new note is created with that date as its title/identifier, filed appropriately, and shown/linked on the Today dashboard.

**US-4**: As the user, I want to see today's schedule, my daily note, and my budget snapshot together on one screen, so I get a full picture of my day at a glance.
- AC: The Today dashboard renders all three sections without requiring navigation; each section deep-links to its full view (calendar, note, or budget).

**US-5**: As the user, I want to log transactions against specific accounts and categories, so I can see where my money goes.
- AC: Adding a transaction requires selecting an account and a category; account balances update immediately; the transaction appears in relevant reports.

**US-6**: As the user, I want to be warned when I'm close to a category budget limit, so I can adjust spending before overshooting.
- AC: When a category's month-to-date spend crosses a configurable threshold (e.g. 90%) of its limit, a visible in-app warning appears; crossing 100% is visually distinct (e.g. red state).

**US-7**: As the user, I want recurring schedule items (e.g. weekly meeting) to appear automatically on their future dates, so I don't re-enter them each time.
- AC: Creating a recurring event with a repeat rule generates/display future occurrences per the rule until an end condition (end date, count, or indefinite) is met.

**US-8**: As the user, I want Windows toast notifications for upcoming schedule items, so I don't miss them even if the app window isn't focused.
- AC: At (or shortly before) an event's scheduled time, a native Windows notification fires with the event title, whether or not the app window is in focus, as long as the app process is running.

## 5. Open Questions (for follow-up before/during design)

- OQ-1: PIN/password strength and recovery — what happens if the user forgets it? Is there a recovery path, or is data loss accepted as the tradeoff for local-only simplicity?
- OQ-2: Data backup — no automatic cloud backup was selected; should there be a manual "export to file" safety net given this is the only copy of financial/notes data? (Strongly recommended given NFR-2's local-only constraint.)
- OQ-3: Multi-currency — is budgeting single-currency only, or should accounts support different currencies?
- OQ-4: Task Scheduler setup UX — does the app silently register the scheduled task on first run, or does it walk the user through it (Task Scheduler registration typically needs the app's install path, which affects packaging)?
- OQ-5: Behavior if the PC is asleep/off at the scheduled launch time — does Task Scheduler's "run as soon as possible after a scheduled start is missed" apply, or is a missed day simply skipped?
- OQ-6: Notification permissions/toast behavior if the app is fully closed (not just unfocused) — is "app must be running" an acceptable constraint, or is background/tray persistence needed to guarantee reminders fire?
- OQ-7: Rich text scope — is a lightweight formatting subset (bold/italic/lists/checkboxes) sufficient, or is embedding images/links also needed in notes?
- OQ-8: Report/export needs for budget data — is on-screen charting sufficient, or is exporting reports (CSV/PDF) needed for taxes/records?

## 6. Explicitly Out of Scope

- Cloud sync or multi-device access
- Multi-user profiles / shared household use
- Bank/API-based transaction import (manual entry only)
- Cross-platform support (macOS/Linux)
