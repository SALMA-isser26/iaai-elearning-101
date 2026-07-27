// src/pages/Payment/PaymentSuccessPage.jsx
// Page affichée après un paiement Stripe réussi
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/store/authStore'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const { refreshProfile } = useAuthStore()
  const [refreshed, setRefreshed] = useState(false)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Rafraîchir le profil pour mettre à jour plan = 'premium' dans Zustand
    // On réessaie jusqu'à 3 fois avec délai croissant (le webhook peut prendre quelques secondes)
    let attempts = 0
    const maxAttempts = 3

    async function tryRefresh() {
      await refreshProfile()
      attempts++

      // Si toujours pas premium et qu'on n'a pas épuisé les tentatives, on réessaie
      const { user: updatedUser } = useAuthStore.getState()
      if (updatedUser?.plan !== 'premium' && attempts < maxAttempts) {
        setTimeout(tryRefresh, 2000 * attempts)
      } else {
        setRefreshed(true)
      }
    }

    // Attendre 1s que le webhook Stripe ait le temps de traiter
    const timer = setTimeout(tryRefresh, 1000)
    return () => clearTimeout(timer)
  }, [refreshProfile])

  return (
    <div className="min-h-screen bg-[#f8f5ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl shadow-[#8127cf]/10 max-w-md w-full p-10 text-center">

        {/* ── Icône succès ─────────────────────────────────────────────────── */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
        >
          <span className="material-symbols-outlined text-white text-[38px]">check_circle</span>
        </div>

        {/* ── Titre ────────────────────────────────────────────────────────── */}
        <h1 className="text-2xl font-bold font-display text-[#0b1c30] mb-2">
          Paiement réussi !
        </h1>
        <p className="text-[#68627a] text-sm mb-6">
          Bienvenue dans le plan Premium. Votre accès à l'intégralité du parcours IA est maintenant actif.
        </p>

        {/* ── Ce qui est débloqué ──────────────────────────────────────────── */}
        <div className="bg-[#f8f5ff] rounded-2xl p-5 mb-6 text-left space-y-3">
          {[
            'Modules 2 à 8 débloqués',
            'Certificat de complétion disponible',
            'Assistant ARIA illimité',
            'Projets pratiques guidés',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8127cf] text-[18px]">check_circle</span>
              <span className="text-sm font-medium text-[#17132f]">{item}</span>
            </div>
          ))}
        </div>

        {/* ── Spinner pendant le refresh ───────────────────────────────────── */}
        {!refreshed && (
          <div className="flex items-center justify-center gap-2 text-xs text-[#68627a] mb-6">
            <span className="w-3 h-3 border-2 border-[#8127cf]/30 border-t-[#8127cf] rounded-full animate-spin" />
            Activation de votre accès en cours...
          </div>
        )}

        {/* ── Boutons ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Link
            to={ROUTES.CURRICULUM}
            className="w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#8127cf]/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
          >
            <span className="material-symbols-outlined text-[18px]">play_circle</span>
            Commencer le Module 2
          </Link>
          <Link
            to={ROUTES.DASHBOARD}
            className="w-full py-3 rounded-xl border border-[#ded6f3] text-[#68627a] text-sm font-medium hover:bg-[#f8f5ff] transition-colors"
          >
            Aller au tableau de bord
          </Link>
        </div>

        {/* ── ID session pour référence ─────────────────────────────────────── */}
        {sessionId && (
          <p className="text-xs text-[#68627a]/50 mt-4">
            Référence : {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  )
}
