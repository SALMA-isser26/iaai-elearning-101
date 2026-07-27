import { useEffect } from 'react'
import AppRouter from '@/router/AppRouter'
import { supabase } from '@/services/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import ErrorBoundary from '@/components/ErrorBoundary'

function App() {
  const { setUser, logout, setLoading } = useAuthStore()
  // Initialise le thème (applique la classe dark sur <html>) dès le démarrage
  useTheme()

  useEffect(() => {
    // Vérifier la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // On ne passe plus session.access_token — le store ne le stocke plus.
        // Le rôle initial vient de user_metadata mais sera immédiatement
        // écrasé par profiles.role dans setUser() → source de vérité unique.
        setUser({
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || '',
          isOnboardingComplete: true,
        })
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      console.error('Error fetching session:', error)
      setLoading(false)
    })

    // Écouter les changements de session (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || '',
            isOnboardingComplete: true,
          })
        } else {
          logout()
        }
      }
    )

    // Nettoyer l'écouteur quand le composant se démonte
    return () => subscription.unsubscribe()
  }, [setUser, logout, setLoading])

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  )
}

export default App