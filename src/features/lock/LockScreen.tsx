import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps): JSX.Element {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [, forceTick] = useState(0)

  // Ticks the countdown text and clears the lockout once it expires —
  // otherwise the input would stay disabled forever without a reload.
  useEffect(() => {
    if (lockedUntil === null) return
    const interval = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null)
      } else {
        forceTick((t) => t + 1)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  const isLockedOut = lockedUntil !== null && lockedUntil > Date.now()

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const result = await api.auth.verifyPin(pin)
    setPin('')

    if (result.ok) {
      onUnlock()
      return
    }
    if (result.lockedUntilMs) {
      setLockedUntil(result.lockedUntilMs)
      setError(null)
    } else {
      setError('Incorrect PIN')
    }
  }

  async function handleReset(): Promise<void> {
    await api.auth.resetData()
    // Main process relaunches the app from here — nothing left to do.
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 text-neutral-900">
      <form onSubmit={handleSubmit} className="w-64 space-y-4 text-center">
        <h1 className="text-xl font-semibold">Enter PIN</h1>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          disabled={isLockedOut}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-center tracking-widest disabled:opacity-40"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {isLockedOut && (
          <p className="text-sm text-red-600">
            Too many attempts. Try again in {Math.ceil((lockedUntil! - Date.now()) / 1000)}s.
          </p>
        )}

        <button
          type="submit"
          disabled={isLockedOut || pin.length === 0}
          className="w-full rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-40"
        >
          Unlock
        </button>

        {!resetConfirm ? (
          <button
            type="button"
            onClick={() => setResetConfirm(true)}
            className="text-xs text-neutral-400 underline"
          >
            Forgot PIN?
          </button>
        ) : (
          <div className="space-y-2 text-xs text-neutral-500">
            <p>This deletes all local data (notes, schedule, budget) and starts over. This cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setResetConfirm(false)} className="underline">
                Cancel
              </button>
              <button type="button" onClick={handleReset} className="text-red-600 underline">
                Reset and start over
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
