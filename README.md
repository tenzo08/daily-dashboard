# Daily Dashboard

A local-only Windows desktop app — notes, schedule, and a budget tracker in one place — that auto-launches every morning via Windows Task Scheduler. Single user, single machine, no cloud, no accounts beyond a local PIN lock.

Built with Electron, React, TypeScript, and SQLite (`better-sqlite3`).

## Status

Phases 0–7 of the build are complete: project scaffold, the SQLite data layer, the IPC/security skeleton, PIN lock with backoff and a forgot-PIN wipe, the tray/window lifecycle, notes (folders, tags, Markdown, daily note), schedule (recurring events, calendar view, reminders setup), and the budget tracker (accounts, transactions, category budgets, reports).

Still to come: the reminder-firing loop, the Today dashboard, Task Scheduler self-registration, a settings screen, and Windows packaging. See `claudedocs/workflow_daily-dashboard.md` for the full phase breakdown.

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

Data lives in SQLite at `%APPDATA%/daily-dashboard/data.db` — local only, no cloud sync.
