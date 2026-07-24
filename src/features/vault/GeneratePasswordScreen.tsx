import { Card } from '@/components/ui/Card'
import { GeneratePasswordPanel } from './GeneratePasswordPanel'

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
      <Card className="max-w-md">
        <GeneratePasswordPanel />
      </Card>
    </div>
  )
}
