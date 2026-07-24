type ReadoutTone = 'dim' | 'accent' | 'success' | 'warning' | 'danger'
type ReadoutSurface = 'dark' | 'light'

// Dark-surface tones use the -bright variants of each semantic color —
// the base tones are tuned for the light dashboard and don't meet
// contrast on void/ink backgrounds.
const TONE_CLASSES: Record<ReadoutSurface, Record<ReadoutTone, string>> = {
  dark: {
    dim: 'text-ink-text-dim',
    accent: 'text-brass-bright',
    success: 'text-success-bright',
    warning: 'text-warning-bright',
    danger: 'text-danger-bright'
  },
  light: {
    dim: 'text-graphite-dim',
    accent: 'text-brass',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger'
  }
}

interface SystemReadoutProps {
  label: string
  value: string
  tone?: ReadoutTone
  surface?: ReadoutSurface
  className?: string
}

// The signature element: a bracketed monospace status line, e.g.
// "[SYSTEM_STATUS: LOCKED]". Used on the lock screen for crypto/version
// specs, and reused at small scale throughout the light dashboard
// (sidebar counts, card headers, last-updated stamps) — the thread that
// ties both modes into one product.
export function SystemReadout({
  label,
  value,
  tone = 'dim',
  surface = 'light',
  className = ''
}: SystemReadoutProps): JSX.Element {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-wider ${TONE_CLASSES[surface][tone]} ${className}`}>
      [{label}: {value}]
    </span>
  )
}
