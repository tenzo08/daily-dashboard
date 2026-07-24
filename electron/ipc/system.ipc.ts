import { clipboard } from 'electron'
import { registerHandler } from './registerHandler'

// Renderer runs sandboxed (no Node/DOM clipboard guarantees under
// file://), so clipboard writes go through the main process instead of
// navigator.clipboard.
export function registerSystemHandlers(): void {
  registerHandler('system:copyToClipboard', (text: string) => {
    clipboard.writeText(text)
  })
}
