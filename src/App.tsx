import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { LockScreen } from '@/features/lock/LockScreen'
import { OnboardingSetPin } from '@/features/lock/OnboardingSetPin'
import { AppShell } from '@/features/shell/AppShell'

// Auth gate — lock screen is unconditionally first (FR-19), AppShell (with
// the route sidebar) only renders once unlocked.
type AuthState = 'loading' | 'needs-setup' | 'locked' | 'unlocked'

export default function App(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    api.auth.isPinSet().then((pinSet) => setAuthState(pinSet ? 'locked' : 'needs-setup'))
  }, [])

  useEffect(() => {
    // Ensures today's daily note exists right after unlock, before any
    // screen is shown — matches ARCHITECTURE.md §5.1's sequence.
    if (authState === 'unlocked') {
      api.notes.getOrCreateDailyNote()
    }
  }, [authState])

  if (authState === 'loading') {
    return <div className="h-screen w-screen bg-neutral-50" />
  }

  if (authState === 'needs-setup') {
    return <OnboardingSetPin onDone={() => setAuthState('locked')} />
  }

  if (authState === 'locked') {
    return <LockScreen onUnlock={() => setAuthState('unlocked')} />
  }

  return <AppShell />
}
