// Phase 3 checkpoint: exercises the auth service's logic directly —
// hashing, wrong-PIN rejection, backoff triggering/expiry, and reset —
// against a real temp SQLite file via tsx (no Electron, no UI). Run with
// `npm run auth:harness`. The IPC/UI wiring on top of this is verified
// separately by actually launching the app (see conversation notes).
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase } from '../db'
import { createSettingsRepository } from '../db/repositories/settings'
import { createAuthService } from './auth'

const tmpDir = mkdtempSync(join(tmpdir(), 'daily-dashboard-auth-harness-'))
const dbPath = join(tmpDir, 'data.db')

function cleanup(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

function section(name: string, fn: () => void): void {
  fn()
  console.log(`  ok  ${name}`)
}

try {
  const db = openDatabase(dbPath)
  const settings = createSettingsRepository(db)
  const auth = createAuthService(settings)

  section('isPinSet is false before any PIN is set', () => {
    assert.equal(auth.isPinSet(), false)
  })

  section('setPin then isPinSet is true', () => {
    auth.setPin('1234')
    assert.equal(auth.isPinSet(), true)
  })

  section('verifyPin rejects wrong PIN without locking out (within free attempts)', () => {
    const result = auth.verifyPin('0000')
    assert.equal(result.ok, false)
    assert.equal(result.lockedUntilMs, undefined)
  })

  section('verifyPin accepts correct PIN and resets attempt counter', () => {
    const result = auth.verifyPin('1234')
    assert.equal(result.ok, true)
    assert.equal(settings.get('lock_failed_attempts'), '0')
  })

  section('repeated wrong attempts trigger backoff past the free-attempt threshold', () => {
    let lastResult
    for (let i = 0; i < 6; i++) {
      lastResult = auth.verifyPin('0000')
    }
    assert.equal(lastResult!.ok, false)
    assert.ok(lastResult!.lockedUntilMs, 'expected a lockout after 6 wrong attempts')
    assert.ok(lastResult!.lockedUntilMs! > Date.now(), 'lockout should be in the future')
  })

  section('correct PIN is still rejected while locked out', () => {
    const result = auth.verifyPin('1234')
    assert.equal(result.ok, false)
    assert.ok(result.lockedUntilMs, 'still locked out even with the right PIN')
  })

  section('once the lockout window passes, correct PIN succeeds again', () => {
    settings.set('lock_locked_until', String(Date.now() - 1000))
    const result = auth.verifyPin('1234')
    assert.equal(result.ok, true)
    assert.equal(settings.get('lock_failed_attempts'), '0')
  })

  section('setPin (e.g. after a reset) clears any prior lock state', () => {
    settings.set('lock_failed_attempts', '10')
    settings.set('lock_locked_until', String(Date.now() + 60_000))
    auth.setPin('5678')
    assert.equal(settings.get('lock_failed_attempts'), '0')
    assert.equal(settings.get('lock_locked_until'), '0')
    assert.equal(auth.verifyPin('5678').ok, true)
  })

  db.close()
  console.log('\nAll Phase 3 auth checks passed.')
} finally {
  cleanup()
}
