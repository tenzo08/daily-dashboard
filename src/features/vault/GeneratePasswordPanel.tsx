import { useState } from 'react'
import { api } from '@/lib/api'
import { StatusPill } from '@/components/ui/StatusPill'
import {
  DEFAULT_GENERATE_OPTIONS,
  estimatePasswordStrength,
  generatePassword,
  type GeneratePasswordOptions
} from '@/lib/generatePassword'

interface GeneratePasswordPanelProps {
  /** When provided, renders a "Use this password" button instead of just copy. */
  onUse?: (password: string) => void
}

const STRENGTH_TONE = { weak: 'danger', fair: 'warning', strong: 'success' } as const
const CHARSET_TOGGLES: { key: keyof GeneratePasswordOptions; label: string }[] = [
  { key: 'uppercase', label: 'A-Z' },
  { key: 'lowercase', label: 'a-z' },
  { key: 'numbers', label: '0-9' },
  { key: 'symbols', label: '!@#' }
]

export function GeneratePasswordPanel({ onUse }: GeneratePasswordPanelProps): JSX.Element {
  const [options, setOptions] = useState<GeneratePasswordOptions>(DEFAULT_GENERATE_OPTIONS)
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_GENERATE_OPTIONS))
  const [copied, setCopied] = useState(false)

  function regenerate(next: GeneratePasswordOptions = options): void {
    setPassword(generatePassword(next))
    setCopied(false)
  }

  function updateOption<K extends keyof GeneratePasswordOptions>(key: K, value: GeneratePasswordOptions[K]): void {
    const next = { ...options, [key]: value }
    setOptions(next)
    regenerate(next)
  }

  async function handleCopy(): Promise<void> {
    await api.system.copyToClipboard(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const strength = estimatePasswordStrength(password)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-control border border-line bg-paper px-3 py-2">
        <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-sm tracking-wide text-graphite">
          {password}
        </code>
        <StatusPill tone={STRENGTH_TONE[strength]}>{strength}</StatusPill>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => regenerate()}
          className="rounded-control border border-line px-3 py-1.5 text-xs text-graphite-dim hover:bg-line/40"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-control border border-line px-3 py-1.5 text-xs text-graphite-dim hover:bg-line/40"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        {onUse && (
          <button
            type="button"
            onClick={() => onUse(password)}
            className="ml-auto rounded-control bg-brass px-3 py-1.5 text-xs font-semibold text-graphite hover:bg-brass-bright"
          >
            Use this password
          </button>
        )}
      </div>

      <div>
        <label className="mb-1 flex items-center justify-between text-xs text-graphite-dim">
          <span>Length</span>
          <span className="font-mono tabular-nums">{options.length}</span>
        </label>
        <input
          type="range"
          min={8}
          max={48}
          value={options.length}
          onChange={(event) => updateOption('length', Number(event.target.value))}
          className="w-full accent-brass"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-graphite-dim">
        {CHARSET_TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={Boolean(options[key])}
              onChange={(event) => updateOption(key, event.target.checked as GeneratePasswordOptions[typeof key])}
              className="accent-brass"
            />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={options.excludeAmbiguous}
            onChange={(event) => updateOption('excludeAmbiguous', event.target.checked)}
            className="accent-brass"
          />
          Avoid look-alikes (0/O, 1/l/I)
        </label>
      </div>
    </div>
  )
}
