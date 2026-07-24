import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'

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
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 text-neutral-900">
      <form onSubmit={handleSubmit} className="w-64 space-y-4 text-center">
        <h1 className="text-xl font-semibold">Set a PIN</h1>
        <p className="text-sm text-neutral-500">Protects your notes, schedule, and budget on this PC.</p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="New PIN"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-center tracking-widest"
        />
        <input
          type="password"
          inputMode="numeric"
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value)}
          placeholder="Confirm PIN"
          className="w-full rounded border border-neutral-300 px-3 py-2 text-center tracking-widest"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pin.length === 0 || confirmPin.length === 0}
          className="w-full rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-40"
        >
          Set PIN
        </button>
      </form>
    </div>
  )
}
