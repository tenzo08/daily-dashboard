import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { LockScreen } from '@/features/lock/LockScreen'
import { OnboardingSetPin } from '@/features/lock/OnboardingSetPin'
import { AppShell } from '@/features/shell/AppShell'

// Auth gate — lock screen is unconditionally first (FR-19), AppShell (with
// the route sidebar) only renders once unlocked.
type AuthState = 'loading' | 'needs-setup' | 'locked' | 'unlocked'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'] as const

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

  // Auto-lock after N idle minutes (Settings → Auto-lock, 0 = disabled).
  // Locking here (not in AppShell) so it fires regardless of which screen
  // is open, and shares the exact same lock path as the sidebar's manual
  // Lock button.
  useEffect(() => {
    if (authState !== 'unlocked') return

    let idleMinutes = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    function scheduleLock(): void {
      if (timeoutId) clearTimeout(timeoutId)
      if (idleMinutes <= 0) return
      timeoutId = setTimeout(async () => {
        await api.auth.lock()
        setAuthState('locked')
      }, idleMinutes * 60_000)
    }

    let cancelled = false
    api.settings.getIdleLockMinutes().then((minutes) => {
      if (cancelled) return
      idleMinutes = minutes
      scheduleLock()
    })

    for (const eventName of ACTIVITY_EVENTS) window.addEventListener(eventName, scheduleLock)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, scheduleLock)
    }
  }, [authState])

  if (authState === 'loading') {
    return <div className="h-screen w-screen bg-paper" />
  }

  if (authState === 'needs-setup') {
    return <OnboardingSetPin onDone={() => setAuthState('locked')} />
  }

  if (authState === 'locked') {
    return <LockScreen onUnlock={() => setAuthState('unlocked')} />
  }

  return <AppShell onLock={() => setAuthState('locked')} />
}
