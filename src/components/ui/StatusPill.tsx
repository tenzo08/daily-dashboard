import type { ReactNode } from 'react'

export type StatusPillTone = 'success' | 'warning' | 'danger' | 'muted' | 'accent'

const TONE_CLASSES: Record<StatusPillTone, string> = {
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  muted: 'bg-muted-tint text-muted',
  accent: 'bg-brass-tint text-brass'
}

interface StatusPillProps {
  tone?: StatusPillTone
  children: ReactNode
  className?: string
}

// Priority/status tag used sparingly across the dashboard (task priority,
// budget threshold state, etc.) — small, pill-shaped, one flat tint per tone.
export function StatusPill({ tone = 'muted', children, className = '' }: StatusPillProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-medium leading-none ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
