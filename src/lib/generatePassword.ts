export interface GeneratePasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const DEFAULT_GENERATE_OPTIONS: GeneratePasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: true
}

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}?'
}

// Ambiguous on-screen: 0/O, 1/l/I, etc.
const AMBIGUOUS_PATTERN = /[0O1lI]/g

/** crypto.getRandomValues, not Math.random — this is a security tool. */
export function generatePassword(options: GeneratePasswordOptions): string {
  let pool = ''
  if (options.uppercase) pool += CHARSETS.uppercase
  if (options.lowercase) pool += CHARSETS.lowercase
  if (options.numbers) pool += CHARSETS.numbers
  if (options.symbols) pool += CHARSETS.symbols
  if (options.excludeAmbiguous) pool = pool.replace(AMBIGUOUS_PATTERN, '')
  if (!pool) pool = CHARSETS.lowercase + CHARSETS.numbers

  const randomValues = new Uint32Array(options.length)
  crypto.getRandomValues(randomValues)

  let result = ''
  for (let i = 0; i < options.length; i++) {
    result += pool[randomValues[i] % pool.length]
  }
  return result
}

export type PasswordStrength = 'weak' | 'fair' | 'strong'

export function estimatePasswordStrength(password: string): PasswordStrength {
  const varietyCount = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (password.length >= 16 && varietyCount >= 3) return 'strong'
  if (password.length >= 10 && varietyCount >= 2) return 'fair'
  return 'weak'
}
