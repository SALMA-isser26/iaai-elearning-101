// src/pages/Auth/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/services/supabaseClient'
import { ROUTES } from '@/constants/routes'
import AuthHeader from '@/components/ui/AuthHeader'
import AuthVisual from '@/components/ui/AuthVisual'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Utilisateur authentifié via le lien de réinitialisation
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  // Indicateur de force du mot de passe (3 barres, comme la maquette)
  const strength = (() => {
    const p = form.password
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score++
    return score
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError(t('auth.reset.error_passwords'))
      return
    }

    if (form.password.length < 6) {
      setError(t('auth.reset.error_length'))
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password })
      if (error) throw error

      setSuccess(true)
      setTimeout(() => navigate(ROUTES.LOGIN), 2500)
    } catch {
      setError(t('auth.reset.error_generic'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5ff] font-sans antialiased">

      <AuthHeader />

      <main className="flex items-center justify-center pb-12 px-2">
        <div className="w-full max-w-[1200px] px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <section className="flex flex-col space-y-8">

            {!success ? (
              <>
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-bold text-[#0b1c30] tracking-tight font-display">
                    {t('auth.reset.title')}
                  </h1>
                  <p className="text-lg text-[#7e7385]">
                    {t('auth.reset.subtitle')}
                  </p>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#4d4354]">
                      {t('auth.reset.new_password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white
                                   text-[#0b1c30] text-base focus:border-[#8127cf]
                                   focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7e7385] hover:text-[#8127cf] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Barre de force du mot de passe */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex gap-1.5 flex-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-colors"
                            style={{
                              background: i < strength
                                ? ['#f87171', '#fbbf24', '#22c55e'][strength - 1]
                                : '#ede9f5',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#7e7385] whitespace-nowrap">Min. 8 caractères</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#4d4354]">
                      {t('auth.reset.confirm_password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white
                                   text-[#0b1c30] text-base focus:border-[#8127cf]
                                   focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7e7385] hover:text-[#8127cf] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 rounded-full text-white text-sm font-semibold mt-4
                               flex items-center justify-center gap-2
                               transition-all duration-300 active:scale-[0.98]
                               disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                  >
                    {isLoading ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        {t('auth.reset.submit')}
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>

                <div>
                  <Link
                    to={ROUTES.LOGIN}
                    className="inline-flex items-center gap-1 text-sm text-[#8127cf] font-semibold hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Retour à la connexion
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] tracking-tight font-display">
                  {t('auth.reset.success')}
                </h1>
                <div className="flex items-center gap-2 text-sm text-[#7e7385]">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#8127cf] border-t-transparent" />
                  Redirection vers la connexion...
                </div>
              </div>
            )}

          </section>

          <AuthVisual
            topBadge={{ icon: 'verified_user', label: 'Protégé par Atlas AI' }}
            bottomCard={{
              icon: 'check_circle',
              iconBg: 'bg-green-500',
              title: 'Mot de passe sécurisé',
              subtitle: 'Protégé par Atlas AI',
            }}
          />

        </div>
      </main>

    </div>
  )
}
