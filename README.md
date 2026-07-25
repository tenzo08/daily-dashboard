# Daily Dashboard

A local-only Windows desktop app — notes, schedule, and a budget tracker in one place — that auto-launches every morning via Windows Task Scheduler. Single user, single machine, no cloud, no accounts beyond a local PIN lock.

Built with Electron, React, TypeScript, and SQLite (`better-sqlite3`).

## Status

All 13 build phases are complete: project scaffold, the SQLite data layer, the IPC/security skeleton, PIN lock with backoff and a forgot-PIN wipe, the tray/window lifecycle, notes, schedule (recurring events, calendar view), the budget tracker (accounts, transactions, category budgets, reports), a background reminder loop with Windows toast notifications, the Today dashboard, Windows Task Scheduler self-registration for the daily auto-launch, a settings screen (launch time, PIN change), an NSIS Windows installer, and a final QA pass against every US-1–US-8 acceptance criterion in `REQUIREMENTS.md`. See `claudedocs/workflow_daily-dashboard.md` for the full phase breakdown.

Since then, the following shipped beyond the original MVP scope (see `REQUIREMENTS.md` §2.6–2.10 and `ARCHITECTURE.md` §4/§6): a full password vault (encrypted credential storage with a weak/reused/old password health check), a task list (with note/schedule links and recurrence), an activity log with configurable retention, JSON export/restore and a transaction-ledger CSV export, note templates and note delete, and system tray quick-actions ("New Task"/"New Note").

Backlog (deliberately deferred — see `ARCHITECTURE.md` §9): multi-currency, DB-at-rest encryption for non-vault data, auto-update.

## Getting started

Requires Node.js 22+ and Windows (Task Scheduler and the tray integration are Windows-specific).

```sh
npm install   # also rebuilds better-sqlite3 against Electron's ABI (postinstall)
npm run dev   # launches the app with hot reload
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Launch the app in development mode (hot reload) |
| `npm run build` | Production build of main/preload/renderer into `out/` |
| `npm run build:win` | Production build + Windows installer via `electron-builder` |
| `npm run preview` | Preview a production build without repackaging |
| `npm run typecheck` | Type-check main/preload and renderer (separate `tsconfig` projects) |
| `npm run lint` | ESLint over the whole project |
| `npm run db:harness` | Standalone check of every SQLite repository against a temp DB file |
| `npm run auth:harness` | Standalone check of the PIN hashing/backoff logic against a temp DB file |
| `npm run db:seed` | Dev-only: fills the dev database (`%APPDATA%/daily-dashboard-dev/data.db`) with sample data for every screen |

The two harness scripts run through Electron's own Node runtime (`ELECTRON_RUN_AS_NODE=1 electron ...`, via `cross-env`) rather than plain `node`, since `better-sqlite3` is kept rebuilt against Electron's ABI, not the system Node's.

## Documentation

- [`REQUIREMENTS.md`](REQUIREMENTS.md) — functional/non-functional requirements, user stories, open questions
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — stack decisions, data model, IPC contract, key flows
- [`claudedocs/workflow_daily-dashboard.md`](claudedocs/workflow_daily-dashboard.md) — phase-by-phase implementation plan and checkpoints

## Project layout

```
electron/          # main process: db, ipc handlers, lock/auth, scheduler, tray
src/                # renderer (React): features/, lib/, types/
resources/          # icons and other packaged assets
```

Data lives in SQLite, local only, no cloud sync. Dev (`npm run dev`) and the packaged/installed app deliberately use separate files so dev-time sample data never ships to the built `.exe`:
- Dev: `%APPDATA%/daily-dashboard-dev/data.db`
- Packaged: `%APPDATA%/daily-dashboard/data.db`
