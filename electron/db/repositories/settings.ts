import type { DB } from '../index'

export function createSettingsRepository(db: DB) {
  const getStmt = db.prepare(`SELECT value FROM app_settings WHERE key = ?`)
  const setStmt = db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)

  return {
    get(key: string): string | undefined {
      const row = getStmt.get(key) as { value: string } | undefined
      return row?.value
    },

    set(key: string, value: string): void {
      setStmt.run({ key, value })
    }
  }
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>
