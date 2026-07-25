import { Card } from '@/components/ui/Card'
import { GeneratePasswordPanel } from './GeneratePasswordPanel'

const TIPS = [
  'Use a unique password for every account — a breach on one site should never unlock another.',
  'Longer beats complex: 16+ characters beats a shorter password with more symbols crammed in.',
  'Save it to My Vault instead of memorizing or reusing it — that’s what the vault is for.',
  'Avoid names, dates, or dictionary words, even with substitutions — those are the first things cracking tools try.'
]

// Standalone tool (sidebar "Generate Password") for one-off passwords that
// don't need to be saved — e.g. setting a password on a site you're not
// ready to add to the vault yet. Saving one long-term still goes through
// "Add credential" in My Vault, which has its own generator inline.
export function GeneratePasswordScreen(): JSX.Element {
  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="mb-1 text-lg font-semibold text-graphite">Generate Password</h1>
      <p className="mb-4 text-xs text-graphite-dim">
        Generated locally with your OS&apos;s cryptographic RNG — nothing here is sent anywhere.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <GeneratePasswordPanel />
        </Card>
        <Card title="Good password habits">
          <ul className="space-y-3">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-graphite-dim">
                <span className="text-brass">·</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
