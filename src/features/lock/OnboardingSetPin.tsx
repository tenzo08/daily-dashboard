import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import heroGraphic from '../../../resources/lock-screen/hero-graphic.svg?raw'

interface OnboardingSetPinProps {
  onDone: () => void
}

export function OnboardingSetPin({ onDone }: OnboardingSetPinProps): JSX.Element {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (pin.length < 4) {
      setError('PIN must be at least 4 characters')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    await api.auth.setPin(pin)
    onDone()
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-void text-ink-text">
      <form onSubmit={handleSubmit} className="w-72 space-y-3 text-center">
        <Icon svg={heroGraphic} className="mx-auto mb-2 h-28 w-28" />
        <h1 className="text-lg font-bold tracking-tight text-ink-text">Daily Dashboard</h1>
        <p className="text-xs text-ink-text-dim">
          Set a PIN to protect your vault, notes, schedule, and budget on this PC.
        </p>

        <PasswordField
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="New PIN"
          inputMode="numeric"
          autoFocus
        />
        <PasswordField
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value)}
          placeholder="Confirm PIN"
          inputMode="numeric"
        />

        {error && <p className="text-xs text-danger-bright">{error}</p>}

        <button
          type="submit"
          disabled={pin.length === 0 || confirmPin.length === 0}
          className="w-full rounded-control bg-brass py-2.5 text-sm font-semibold text-void hover:bg-brass-bright disabled:opacity-40"
        >
          Set PIN
        </button>

        <p className="pt-2 font-mono text-[10px] tracking-wider text-ink-text-dim">
          AES-256 · Argon2id · Local-first · v0.1.0
        </p>
      </form>
    </div>
  )
}
