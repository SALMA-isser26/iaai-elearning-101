// src/hooks/useTheme.js
import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

/**
 * Hook qui applique la classe CSS `dark` sur <html>
 * en fonction du thème choisi dans le store.
 *
 * Modes :
 *   'light'  → force le mode clair
 *   'dark'   → force le mode sombre
 *   'system' → suit prefers-color-scheme du système
 *
 * Retourne : { theme, isDark, setTheme, toggleTheme }
 */
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore()

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (currentTheme) => {
      if (currentTheme === 'dark') {
        root.classList.add('dark')
      } else if (currentTheme === 'light') {
        root.classList.remove('dark')
      } else {
        // 'system' — suit le système
        if (mediaQuery.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    applyTheme(theme)

    // Si en mode 'system', écouter les changements OS
    if (theme === 'system') {
      const listener = () => applyTheme('system')
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [theme])

  const isDark = (() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })()

  return { theme, isDark, setTheme, toggleTheme }
}
