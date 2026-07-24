export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'daily-dashboard-theme'

// Only the dashboard side has a light/dark toggle — the lock screen is
// always the dark "vault" mode by design, so this never touches it (see
// index.css: the dark override only redefines paper/surface/graphite/status
// tokens, not void/ink).
export function getStoredTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}
