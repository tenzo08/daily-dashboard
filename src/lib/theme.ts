import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'daily-dashboard-theme'
const THEME_EVENT = 'daily-dashboard:theme-change'

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
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }))
}

// For components that render colors Tailwind's CSS variables can't reach —
// e.g. recharts, which takes literal hex strings as props, not classes.
export function useThemeValue(): Theme {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    const handler = (event: Event): void => setTheme((event as CustomEvent<Theme>).detail)
    window.addEventListener(THEME_EVENT, handler)
    return () => window.removeEventListener(THEME_EVENT, handler)
  }, [])

  return theme
}
