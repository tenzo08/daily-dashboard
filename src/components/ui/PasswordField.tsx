import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  /** 'dark' (default) for the void/ink lock screen, 'light' for forms on the paper dashboard. */
  surface?: 'dark' | 'light'
  /** Lock screen centers + tracks out the PIN; form fields read left-aligned. */
  align?: 'center' | 'left'
}

const SURFACE_CLASSES = {
  dark: 'border-ink-line bg-ink-raised text-ink-text placeholder:text-ink-text-dim',
  light: 'border-line bg-paper text-graphite placeholder:text-graphite-dim'
}

const TOGGLE_CLASSES = {
  dark: 'text-ink-text-dim hover:text-ink-text',
  light: 'text-graphite-dim hover:text-graphite'
}

// Single password field used on both the lock screen and vault forms:
// show/hide toggle rendered as a small mono label rather than an icon
// button, to stay in the system-status voice.
export function PasswordField({
  label,
  surface = 'dark',
  align = 'center',
  className = '',
  ...rest
}: PasswordFieldProps): JSX.Element {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-left text-xs text-graphite-dim">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-control border px-3 py-2 pr-14 tracking-widest focus:border-brass focus:outline-none disabled:opacity-40 ${
            align === 'center' ? 'text-center' : 'text-left'
          } ${SURFACE_CLASSES[surface]} ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className={`absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider ${TOGGLE_CLASSES[surface]}`}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}
