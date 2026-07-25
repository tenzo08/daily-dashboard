import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import heroGraphic from '../../../resources/lock-screen/hero-graphic.svg?raw'

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
    <div className="flex h-screen w-screen flex-col bg-void text-ink-text">
      {/* Centered in the space above the status footer, not the raw
          viewport — otherwise the fixed footer visually pushes the card
          off-center. */}
      <div className="flex flex-1 items-center justify-center px-6">
        <form onSubmit={handleSubmit} className="flex w-72 flex-col items-center gap-4 text-center">
          <Icon svg={heroGraphic} className="h-20 w-20" />

          <div className="space-y-1">
            <h1 className="text-lg font-bold tracking-tight text-ink-text">Daily Dashboard</h1>
            <p className="text-sm text-ink-text-dim">Coded for privacy.</p>
            <p className="text-xs leading-relaxed text-ink-text-dim">
              Your passwords and personal notes stay encrypted, private, and fully under your control — always.
            </p>
          </div>

          <div className="w-full space-y-2">
            <PasswordField
              label="Master password"
              inputMode="numeric"
              autoFocus
              disabled={isLockedOut}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
            {error && <p className="text-xs text-danger-bright">{error}</p>}
            {isLockedOut && (
              <p className="text-xs text-danger-bright">
                Too many attempts. Try again in {Math.ceil((lockedUntil! - Date.now()) / 1000)}s.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLockedOut || pin.length === 0}
            className="w-full rounded-control bg-brass py-2.5 text-sm font-semibold text-void hover:bg-brass-bright disabled:opacity-40"
          >
            Unlock Vault →
          </button>

          <p className="font-mono text-[10px] tracking-wider text-ink-text-dim">
            AES-256 · Argon2id · Local-first · v0.1.0
          </p>

          {!resetConfirm ? (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="font-mono text-[10px] uppercase tracking-wider text-ink-text-dim underline hover:text-ink-text"
            >
              Forgot PIN?
            </button>
          ) : (
            <div className="space-y-2 text-xs text-ink-text-dim">
              <p>This deletes all local data (notes, schedule, budget, vault) and starts over. This cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => setResetConfirm(false)} className="underline">
                  Cancel
                </button>
                <button type="button" onClick={handleReset} className="text-danger-bright underline">
                  Reset and start over
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="border-t border-ink-line px-4 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-text-dim">
        [ SYSTEM_STATUS: {isLockedOut ? 'LOCKED_OUT' : 'LOCKED'} ] root@daily-dashboard:/vault — NO CLOUD. NO
        BACKDOORS. NO COMPROMISE. HAND-CODED FOR PRIVACY.
      </div>
    </div>
  )
}
