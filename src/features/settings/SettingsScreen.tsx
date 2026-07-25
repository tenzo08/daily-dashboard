import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'

type SaveState = 'idle' | 'saving' | 'saved'

export function SettingsScreen(): JSX.Element {
  const [launchTime, setLaunchTime] = useState('')
  const [launchTimeSaveState, setLaunchTimeSaveState] = useState<SaveState>('idle')

  const [idleLockMinutes, setIdleLockMinutes] = useState('')
  const [idleLockSaveState, setIdleLockSaveState] = useState<SaveState>('idle')

  const [retentionDays, setRetentionDays] = useState('')
  const [retentionSaveState, setRetentionSaveState] = useState<SaveState>('idle')

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinChangeState, setPinChangeState] = useState<SaveState>('idle')

  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)

  useEffect(() => {
    api.settings.getLaunchTime().then(setLaunchTime)
    api.settings.getIdleLockMinutes().then((minutes) => setIdleLockMinutes(String(minutes)))
    api.settings.getActivityRetentionDays().then((days) => setRetentionDays(String(days)))
  }, [])

  async function handleLaunchTimeChange(value: string): Promise<void> {
    setLaunchTime(value)
    if (!value) return
    setLaunchTimeSaveState('saving')
    await api.settings.setLaunchTime(value)
    setLaunchTimeSaveState('saved')
  }

  async function handleIdleLockChange(value: string): Promise<void> {
    setIdleLockMinutes(value)
    const minutes = Number(value)
    if (value === '' || Number.isNaN(minutes) || minutes < 0) return
    setIdleLockSaveState('saving')
    await api.settings.setIdleLockMinutes(minutes)
    setIdleLockSaveState('saved')
  }

  async function handleRetentionChange(value: string): Promise<void> {
    setRetentionDays(value)
    const days = Number(value)
    if (value === '' || Number.isNaN(days) || days < 0) return
    setRetentionSaveState('saving')
    await api.settings.setActivityRetentionDays(days)
    setRetentionSaveState('saved')
  }

  async function handlePinChange(event: FormEvent): Promise<void> {
    event.preventDefault()
    setPinError(null)

    if (newPin.length < 4) {
      setPinError('New PIN must be at least 4 characters')
      return
    }
    if (newPin !== confirmNewPin) {
      setPinError('New PINs do not match')
      return
    }

    setPinChangeState('saving')
    // Composed from the existing auth primitives (Phase 3), not a new
    // backend method — verify the current PIN before allowing a change,
    // so an already-unlocked app can't be silently re-locked out.
    const result = await api.auth.verifyPin(currentPin)
    if (!result.ok) {
      setPinChangeState('idle')
      setPinError(result.lockedUntilMs ? 'Too many attempts — try again later' : 'Current PIN is incorrect')
      return
    }

    await api.auth.setPin(newPin)
    setCurrentPin('')
    setNewPin('')
    setConfirmNewPin('')
    setPinChangeState('saved')
  }

  async function handleExport(): Promise<void> {
    setBackupBusy(true)
    setBackupMessage(null)
    setBackupError(null)
    try {
      const { path } = await api.backup.export()
      if (path) setBackupMessage(`Exported to ${path}`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error))
    }
    setBackupBusy(false)
  }

  async function handleImport(): Promise<void> {
    setBackupBusy(true)
    setBackupMessage(null)
    setBackupError(null)
    try {
      const { imported, path } = await api.backup.import()
      if (imported) setBackupMessage(`Imported from ${path} — restart the app to see everything.`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error))
    }
    setBackupBusy(false)
  }

  async function handleExportTransactionsCsv(): Promise<void> {
    setBackupBusy(true)
    setBackupMessage(null)
    setBackupError(null)
    try {
      const { path } = await api.backup.exportTransactionsCsv()
      if (path) setBackupMessage(`Exported to ${path}`)
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error))
    }
    setBackupBusy(false)
  }

  return (
    <div className="max-w-md flex-1 space-y-8 overflow-auto p-6">
      <h1 className="text-lg font-semibold text-graphite">Settings</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium text-graphite-dim">Daily launch time</h2>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={launchTime}
            onChange={(event) => handleLaunchTimeChange(event.target.value)}
            className="rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
          <span className="font-mono text-[11px] uppercase tracking-wider text-graphite-dim">
            {launchTimeSaveState === 'saving' ? 'Saving…' : launchTimeSaveState === 'saved' ? 'Saved' : ''}
          </span>
        </div>
        <p className="mt-1 text-xs text-graphite-dim">The app auto-launches around this time every day.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-graphite-dim">Auto-lock</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={idleLockMinutes}
            onChange={(event) => handleIdleLockChange(event.target.value)}
            className="w-20 rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
          <span className="text-xs text-graphite-dim">minutes idle</span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-graphite-dim">
            {idleLockSaveState === 'saving' ? 'Saving…' : idleLockSaveState === 'saved' ? 'Saved' : ''}
          </span>
        </div>
        <p className="mt-1 text-xs text-graphite-dim">Locks the vault automatically after this much inactivity. 0 disables it.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-graphite-dim">Activity log</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={retentionDays}
            onChange={(event) => handleRetentionChange(event.target.value)}
            className="w-20 rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
          <span className="text-xs text-graphite-dim">days of history to keep</span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-graphite-dim">
            {retentionSaveState === 'saving' ? 'Saving…' : retentionSaveState === 'saved' ? 'Saved' : ''}
          </span>
        </div>
        <p className="mt-1 text-xs text-graphite-dim">Older entries are pruned automatically. 0 keeps everything.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-graphite-dim">Export / Backup</h2>
        <p className="mb-2 text-xs text-graphite-dim">
          Exports everything — notes, tasks, schedule, budget, and vault credentials — to a JSON file you choose.{' '}
          <strong className="font-medium text-danger">
            Vault passwords are written in plain text so the file can actually restore your vault
          </strong>{' '}
          — store it somewhere as safe as the passwords themselves. Import only works into a completely empty vault
          (e.g. right after &quot;Forgot PIN&quot;).
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={backupBusy}
            className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
          >
            Export data…
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={backupBusy}
            className="rounded-control border border-line px-3 py-1.5 text-sm text-graphite-dim hover:bg-line/40 disabled:opacity-40"
          >
            Import data…
          </button>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs text-graphite-dim">
            Or export just the transaction ledger as a plain CSV — for dropping into Excel/Sheets, not for restoring.
          </p>
          <button
            type="button"
            onClick={handleExportTransactionsCsv}
            disabled={backupBusy}
            className="rounded-control border border-line px-3 py-1.5 text-sm text-graphite-dim hover:bg-line/40 disabled:opacity-40"
          >
            Export transactions (CSV)…
          </button>
        </div>

        {backupMessage && <p className="mt-2 text-xs text-success">{backupMessage}</p>}
        {backupError && <p className="mt-2 text-xs text-danger">{backupError}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-graphite-dim">Change PIN</h2>
        <form onSubmit={handlePinChange} className="space-y-2">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value)}
            className="w-full rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="New PIN"
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
            className="w-full rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Confirm new PIN"
            value={confirmNewPin}
            onChange={(event) => setConfirmNewPin(event.target.value)}
            className="w-full rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
          {pinError && <p className="text-xs text-danger">{pinError}</p>}
          {pinChangeState === 'saved' && <p className="text-xs text-success">PIN updated.</p>}
          <button
            type="submit"
            disabled={pinChangeState === 'saving' || !currentPin || !newPin || !confirmNewPin}
            className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
          >
            Update PIN
          </button>
        </form>
      </section>
    </div>
  )
}
