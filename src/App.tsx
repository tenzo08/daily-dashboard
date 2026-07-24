import { useEffect } from 'react'
import { api } from '@/lib/api'

export default function App(): JSX.Element {
  useEffect(() => {
    // Phase 2 smoke test — proves the renderer -> preload -> ipcMain -> DB
    // round trip. Remove alongside main.ts's ping handler once P3 lands.
    api.ping().then((result) => console.log('[ping]', result))
  }, [])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 text-neutral-900">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Daily Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500">Scaffold running. Features land in later phases.</p>
      </div>
    </div>
  )
}
