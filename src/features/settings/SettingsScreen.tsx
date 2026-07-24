import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'

type SaveState = 'idle' | 'saving' | 'saved'

export function SettingsScreen(): JSX.Element {
  const [launchTime, setLaunchTime] = useState('')
  const [launchTimeSaveState, setLaunchTimeSaveState] = useState<SaveState>('idle')

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinChangeState, setPinChangeState] = useState<SaveState>('idle')

  useEffect(() => {
    api.settings.getLaunchTime().then(setLaunchTime)
  }, [])

  async function handleLaunchTimeChange(value: string): Promise<void> {
    setLaunchTime(value)
    if (!value) return
    setLaunchTimeSaveState('saving')
    await api.settings.setLaunchTime(value)
    setLaunchTimeSaveState('saved')
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

  return (
    <div className="max-w-md space-y-8 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Daily launch time</h2>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={launchTime}
            onChange={(event) => handleLaunchTimeChange(event.target.value)}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <span className="text-xs text-neutral-400">
            {launchTimeSaveState === 'saving' ? 'Saving…' : launchTimeSaveState === 'saved' ? 'Saved' : ''}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-400">The app auto-launches around this time every day.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Change PIN</h2>
        <form onSubmit={handlePinChange} className="space-y-2">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="New PIN"
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Confirm new PIN"
            value={confirmNewPin}
            onChange={(event) => setConfirmNewPin(event.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          {pinError && <p className="text-xs text-red-600">{pinError}</p>}
          {pinChangeState === 'saved' && <p className="text-xs text-green-600">PIN updated.</p>}
          <button
            type="submit"
            disabled={pinChangeState === 'saving' || !currentPin || !newPin || !confirmNewPin}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Update PIN
          </button>
        </form>
      </section>
    </div>
  )
}
