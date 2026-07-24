import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { argon2id } from 'hash-wasm'
import type { EncryptedSecret } from '../db/types'

const AES_KEY_LEN = 32 // AES-256
const AES_IV_LEN = 12 // recommended for GCM

// Costs tuned for an interactive unlock (~150-300ms on typical hardware),
// not a login-throttling KDF — the PIN itself already has lockout backoff
// (see lock/auth.ts). This one's job is turning the PIN into a key strong
// enough that a stolen data.db file isn't a one-step break-in.
const ARGON2_ITERATIONS = 3
const ARGON2_MEMORY_KIB = 65536 // 64 MB
const ARGON2_PARALLELISM = 1

export function generateVaultSalt(): string {
  return randomBytes(16).toString('hex')
}

export async function deriveVaultKey(pin: string, saltHex: string): Promise<Buffer> {
  const hashHex = await argon2id({
    password: pin,
    salt: Buffer.from(saltHex, 'hex'),
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    parallelism: ARGON2_PARALLELISM,
    hashLength: AES_KEY_LEN,
    outputType: 'hex'
  })
  return Buffer.from(hashHex, 'hex')
}

export function encryptSecret(plaintext: string, key: Buffer): EncryptedSecret {
  const iv = randomBytes(AES_IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    secretCipher: ciphertext.toString('base64'),
    secretIv: iv.toString('base64'),
    secretTag: cipher.getAuthTag().toString('base64')
  }
}

export function decryptSecret(secret: EncryptedSecret, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(secret.secretIv, 'base64'))
  decipher.setAuthTag(Buffer.from(secret.secretTag, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.secretCipher, 'base64')),
    decipher.final()
  ])
  return plaintext.toString('utf8')
}
