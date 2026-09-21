import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'auto' | 'day' | 'night'
type Theme = Exclude<ThemePreference, 'auto'>

// Keep the key and initial resolution in sync with index.html's pre-paint script.
const STORAGE_KEY = 'williamslab.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'day' || saved === 'night') return saved
  } catch {
    // Auto still works when browser storage is unavailable.
  }
  return 'auto'
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)
  const [systemTheme, setSystemTheme] = useState<Theme>(() => window.matchMedia(DARK_QUERY).matches ? 'night' : 'day')
  const theme = preference === 'auto' ? systemTheme : preference

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const updateSystemTheme = () => setSystemTheme(media.matches ? 'night' : 'day')
    const updatePreference = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === STORAGE_KEY || event.key === null)) {
        setPreference(readPreference())
      }
    }
    updateSystemTheme()
    media.addEventListener('change', updateSystemTheme)
    window.addEventListener('storage', updatePreference)
    return () => {
      media.removeEventListener('change', updateSystemTheme)
      window.removeEventListener('storage', updatePreference)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Keep the selected mode for this session even if it cannot be saved.
    }
  }, [])

  return { preference, theme, setThemePreference }
}
