import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createCredentialsRepository } from '../db/repositories/credentials'
import type { CredentialHealthEntry, CredentialHealthIssue, CredentialSecret, NewCredentialInput } from '../db/types'
import { decryptSecret, encryptSecret } from '../lock/vaultCrypto'
import { vaultSession } from '../lock/vaultSession'
import { estimatePasswordStrength } from '../../src/lib/generatePassword'
import { registerHandler } from './registerHandler'

const OLD_PASSWORD_DAYS = 365

function packSecret(secret: CredentialSecret): string {
  return JSON.stringify(secret)
}

function unpackSecret(json: string): CredentialSecret {
  return JSON.parse(json) as CredentialSecret
}

export function registerCredentialsHandlers(db: DB): void {
  const credentials = createCredentialsRepository(db)
  const activity = createActivityLogRepository(db)

  registerHandler('credentials:list', () => credentials.list())

  registerHandler('credentials:create', (input: NewCredentialInput) => {
    const key = vaultSession.require()
    const encrypted = encryptSecret(packSecret({ password: input.password, notes: input.notes ?? null }), key)
    const summary = credentials.create({
      title: input.title,
      username: input.username ?? null,
      url: input.url ?? null,
      folder: input.folder ?? null,
      ...encrypted
    })
    activity.log('credential.created', `Added credential — ${summary.title}`)
    return summary
  })

  registerHandler('credentials:update', (id: number, patch: Partial<NewCredentialInput>) => {
    const key = vaultSession.require()
    const row = credentials.get(id)
    if (!row) throw new Error(`Credential ${id} not found`)

    if (patch.password !== undefined || patch.notes !== undefined) {
      const current = unpackSecret(decryptSecret(row, key))
      const next: CredentialSecret = {
        password: patch.password ?? current.password,
        notes: patch.notes !== undefined ? patch.notes : current.notes
      }
      credentials.updateSecret(id, encryptSecret(packSecret(next), key))
    }

    const summary = credentials.updateMeta(id, {
      title: patch.title,
      username: patch.username,
      url: patch.url,
      folder: patch.folder
    })
    activity.log('credential.updated', `Updated credential — ${summary.title}`)
    return summary
  })

  registerHandler('credentials:delete', (id: number) => {
    const row = credentials.get(id)
    credentials.delete(id)
    if (row) activity.log('credential.deleted', `Deleted credential — ${row.title}`)
  })

  registerHandler('credentials:reveal', (id: number): CredentialSecret => {
    const key = vaultSession.require()
    const row = credentials.get(id)
    if (!row) throw new Error(`Credential ${id} not found`)
    return unpackSecret(decryptSecret(row, key))
  })

  // Decrypts every password server-side to check for weak/reused/old ones —
  // only the resulting flags cross back over IPC, never the plaintexts
  // themselves (reveal() stays the one path that returns a real password).
  registerHandler('credentials:health', (): CredentialHealthEntry[] => {
    const key = vaultSession.require()
    const rows = credentials.listAll()

    const passwords = rows.map((row) => unpackSecret(decryptSecret(row, key)).password)
    const countByPassword = new Map<string, number>()
    for (const password of passwords) {
      countByPassword.set(password, (countByPassword.get(password) ?? 0) + 1)
    }

    const cutoff = Date.now() - OLD_PASSWORD_DAYS * 24 * 60 * 60 * 1000

    return rows
      .map((row, i) => {
        const password = passwords[i]
        const issues: CredentialHealthIssue[] = []
        if (estimatePasswordStrength(password) === 'weak') issues.push('weak')
        if ((countByPassword.get(password) ?? 0) > 1) issues.push('reused')
        if (new Date(row.secretUpdatedAt).getTime() < cutoff) issues.push('old')
        return { id: row.id, issues }
      })
      .filter((entry) => entry.issues.length > 0)
  })
}
