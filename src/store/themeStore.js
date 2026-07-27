// src/store/themeStore.js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Safe localStorage wrapper that handles access errors gracefully
const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      // Silently fail if localStorage is not available
      console.debug('localStorage unavailable:', e.message)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Silently fail
    }
  },
}

/**
 * Store de thème persisté en localStorage.
 * theme: 'light' | 'dark' | 'system'
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'system', // valeur par défaut : suit le système

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
    }),
    {
      name: 'iaai-theme', // clé localStorage
      storage: createJSONStorage(() => safeStorage),
    }
  )
)