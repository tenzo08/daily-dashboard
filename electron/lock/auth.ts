import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { SettingsRepository } from '../db/repositories/settings'

const SCRYPT_KEYLEN = 64
// First few wrong attempts cost nothing; beyond that, backoff doubles each
// attempt up to a cap. Forgetting isn't rare — this just deters brute force.
const FREE_ATTEMPTS = 5
const BACKOFF_BASE_MS = 30_000
const BACKOFF_CAP_MS = 5 * 60_000

export interface VerifyPinResult {
  ok: boolean
  lockedUntilMs?: number
}

function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, SCRYPT_KEYLEN).toString('hex')
}

export function createAuthService(settings: SettingsRepository) {
  return {
    isPinSet(): boolean {
      return settings.get('pin_hash') !== undefined
    },

    setPin(pin: string): void {
      const salt = randomBytes(16).toString('hex')
      settings.set('pin_salt', salt)
      settings.set('pin_hash', hashPin(pin, salt))
      settings.set('lock_failed_attempts', '0')
      settings.set('lock_locked_until', '0')
    },

    verifyPin(pin: string): VerifyPinResult {
      const lockedUntil = Number(settings.get('lock_locked_until') ?? '0')
      const now = Date.now()
      if (lockedUntil > now) {
        return { ok: false, lockedUntilMs: lockedUntil }
      }

      const salt = settings.get('pin_salt')
      const storedHash = settings.get('pin_hash')
      if (!salt || !storedHash) {
        return { ok: false }
      }

      const candidateHash = hashPin(pin, salt)
      const matches = timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(storedHash, 'hex'))

      if (matches) {
        settings.set('lock_failed_attempts', '0')
        settings.set('lock_locked_until', '0')
        return { ok: true }
      }

      const attempts = Number(settings.get('lock_failed_attempts') ?? '0') + 1
      settings.set('lock_failed_attempts', String(attempts))

      if (attempts > FREE_ATTEMPTS) {
        const backoffMs = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - FREE_ATTEMPTS - 1), BACKOFF_CAP_MS)
        const until = now + backoffMs
        settings.set('lock_locked_until', String(until))
        return { ok: false, lockedUntilMs: until }
      }

      return { ok: false }
    }
  }
}

export type AuthService = ReturnType<typeof createAuthService>
