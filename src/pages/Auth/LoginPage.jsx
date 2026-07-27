// src/pages/Auth/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import AuthHeader from '@/components/ui/AuthHeader'
import AuthVisual from '@/components/ui/AuthVisual'

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  // Rediriger vers la page demandée avant login, sinon dashboard
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const data = await login({
        email: form.email,
        password: form.password,
      })

      await setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || '',
        role: data.user.user_metadata?.role || 'LEARNER',
        isOnboardingComplete: true,
      })

      navigate(from, { replace: true })
    } catch (err) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        const minutes = Math.max(1, Math.ceil((err.retryAfterSeconds ?? 0) / 60))
        setError(t('auth.login.locked', { minutes }))
      } else {
        setError(t('auth.login.error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5ff] font-sans antialiased">

      <AuthHeader />

      {/* Main */}
      <main className="flex items-center justify-center pb-12 px-2">
        <div className="w-full max-w-[1200px] px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Formulaire */}
          <section className="flex flex-col space-y-8">

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-[#0b1c30] tracking-tight font-display">
                {t('auth.login.title')}
              </h1>
              <p className="text-lg text-[#7e7385]">
                {t('auth.login.subtitle')}
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4d4354]">
                  {t('auth.login.email')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="amina@exemple.ma"
                  required
                  className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white text-[#0b1c30] text-base
                             focus:border-[#8127cf] focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all"
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[#4d4354]">
                    {t('auth.login.password')}
                  </label>
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-sm text-[#8127cf] font-semibold hover:underline"
                  >
                    {t('auth.login.forgot')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white text-[#0b1c30] text-base
                               focus:border-[#8127cf] focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all pr-12"
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
              </div>

              {/* Bouton submit */}
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
                    {t('auth.login.submit')}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

            </form>

            <p className="text-base text-[#4d4354] text-center lg:text-left">
              {t('auth.login.no_account')}{' '}
              <Link to={ROUTES.REGISTER} className="text-[#8127cf] font-bold hover:underline">
                {t('auth.login.create_account')}
              </Link>
            </p>

          </section>

          {/* Illustration */}
          <AuthVisual
            topBadge={{ icon: 'school', label: 'IAAI eLearning' }}
          />

        </div>
      </main>

    </div>
  )
}

export default LoginPage