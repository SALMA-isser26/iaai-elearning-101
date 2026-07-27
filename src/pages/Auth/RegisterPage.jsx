import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import AuthHeader from '@/components/ui/AuthHeader'
import AuthVisual from '@/components/ui/AuthVisual'

function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setIsLoading(true)
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      })
      localStorage.setItem('iaai-pending-email', form.email)
      navigate(ROUTES.VERIFY_EMAIL)
    } catch (error) {
  console.error('REGISTER ERROR:', error)
  setError(error?.message || 'Une erreur est survenue.')
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
                Créez votre compte gratuit
              </h1>
              <p className="text-lg text-[#7e7385]">
                Rejoignez 2 400 apprenants au Maroc et ailleurs
              </p>
            </div>

            {/* Message erreur */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Nom complet */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4d4354]">
                  Votre nom complet
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Ex: Amina Alami"
                  required
                  className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white text-[#0b1c30] text-base
                             focus:border-[#8127cf] focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4d4354]">
                  Votre email
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
                <label className="block text-sm font-medium text-[#4d4354]">
                  Créez un mot de passe
                </label>
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

              {/* Confirmer mot de passe */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4d4354]">
                  Confirmez votre mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white text-[#0b1c30] text-base
                               focus:border-[#8127cf] focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all pr-12"
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
                    Créer mon compte
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

            </form>

            <p className="text-base text-[#4d4354] text-center lg:text-left">
              Déjà un compte ?{' '}
              <Link to={ROUTES.LOGIN} className="text-[#8127cf] font-bold hover:underline">
                Se connecter
              </Link>
            </p>

          </section>

          {/* Illustration */}
          <AuthVisual
            topBadge={{ icon: 'auto_awesome', label: 'IA Apprenante' }}
            bottomCard={{
              icon: 'shield',
              iconBg: 'bg-[#ec4899]',
              title: 'Gratuit pour commencer',
              subtitle: 'Aucune carte bancaire',
            }}
          />

        </div>
      </main>

    </div>
  )
}

export default RegisterPage