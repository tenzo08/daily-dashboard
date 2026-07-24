import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { LockScreen } from '@/features/lock/LockScreen'
import { OnboardingSetPin } from '@/features/lock/OnboardingSetPin'

// Lightweight auth gate — Phase 4's router shell (T4.4) will subsume this
// with real routes. Until then, this is the whole app: lock screen is
// unconditionally first (FR-19), everything else is a placeholder.
type AuthState = 'loading' | 'needs-setup' | 'locked' | 'unlocked'

export default function App(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    api.auth.isPinSet().then((pinSet) => setAuthState(pinSet ? 'locked' : 'needs-setup'))
  }, [])

  if (authState === 'loading') {
    return <div className="h-screen w-screen bg-neutral-50" />
  }

  if (authState === 'needs-setup') {
    return <OnboardingSetPin onDone={() => setAuthState('locked')} />
  }

  if (authState === 'locked') {
    return <LockScreen onUnlock={() => setAuthState('unlocked')} />
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 text-neutral-900">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Daily Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500">Unlocked. Today dashboard lands in a later phase.</p>
      </div>
    </div>
  )
}
