// src/store/authStore.js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/services/supabaseClient'

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
      // Silently fail if localStorage is not available (security restrictions, private browsing, etc.)
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

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      // ─── CORRECTION : accessToken retiré du state
      //
      // Avant : le JWT était stocké dans Zustand + persisté en localStorage.
      // Problème : localStorage est accessible par n'importe quel script JS
      // sur la page → vecteur XSS. Supabase gère nativement le stockage et
      // le rafraîchissement des tokens via son client interne (httpOnly cookie
      // ou localStorage encapsulé). Dupliquer le token dans Zustand est
      // redondant ET risqué.
      //
      // Si vous avez besoin du token dans un composant, utilisez :
      //   const { data: { session } } = await supabase.auth.getSession()
      //   session.access_token

      setUser: async (user) => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan, role, full_name')
            .eq('id', user.id)
            .single()

          const enrichedUser = {
            ...user,
            plan:     profile?.plan     ?? 'free',
            role:     profile?.role     ?? 'LEARNER',
            fullName: profile?.full_name || user.fullName || user.email,
          }

          set({
            user: enrichedUser,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          set({
            user: { ...user, plan: 'free', role: 'LEARNER' },
            isAuthenticated: true,
            isLoading: false,
          })
        }
      },

      logout: () =>
        set({
          user:            null,
          isAuthenticated: false,
          isLoading:       false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      refreshProfile: async () => {
        const { user } = get()
        if (!user?.id) return
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan, role, full_name')
            .eq('id', user.id)
            .single()

          if (profile) {
            set((state) => ({
              user: {
                ...state.user,
                plan:     profile.plan,
                role:     profile.role,
                fullName: profile.full_name || state.user.fullName,
              },
            }))
          }
        } catch (err) {
          console.warn('refreshProfile error:', err)
        }
      },
    }),
    {
      name: 'iaai-auth',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        // ─── CORRECTION : accessToken retiré de la persistance
        // Seuls user et isAuthenticated sont persistés.
        // isLoading n'est pas persisté : il doit toujours démarrer à true
        // pour forcer la vérification de session au rechargement.
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)