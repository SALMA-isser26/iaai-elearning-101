// src/pages/Auth/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forgotPassword } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import AuthHeader from '@/components/ui/AuthHeader'
import AuthVisual from '@/components/ui/AuthVisual'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setError(t('auth.forgot.error'))
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

            {!sent ? (
              <>
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#f0dbff] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-[#8127cf] text-[28px]">
                      lock_reset
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-[#0b1c30] tracking-tight font-display">
                    {t('auth.forgot.title')}
                  </h1>
                  <p className="text-lg text-[#7e7385]">
                    {t('auth.forgot.subtitle')}
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
                      {t('auth.forgot.email')}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null) }}
                      placeholder="amina@exemple.ma"
                      required
                      className="w-full px-5 py-4 rounded-xl border border-[#f0f0f5] bg-white
                                 text-[#0b1c30] text-base focus:border-[#8127cf]
                                 focus:ring-4 focus:ring-[#8127cf]/10 focus:outline-none transition-all"
                    />
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
                      t('auth.forgot.submit')
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#f0dbff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#8127cf] text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    mark_email_read
                  </span>
                </div>
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-bold text-[#0b1c30] tracking-tight font-display">
                    {t('auth.forgot.success_title')}
                  </h1>
                  <p className="text-lg text-[#7e7385]">
                    {t('auth.forgot.success_desc')}{' '}
                    <span className="font-semibold text-[#8127cf]">{email}</span>
                  </p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-[#eef1ff] border border-[#dbe2ff] text-[#4d4354] text-sm flex gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#8127cf] flex-shrink-0">info</span>
                  Un lien de réinitialisation a été envoyé. Ce lien est valable pendant 30 minutes. Vérifiez également vos spams.
                </div>
                <p className="text-sm text-[#7e7385]">
                  Vous n'avez pas reçu l'email ?{' '}
                  <button onClick={handleSubmit} className="text-[#8127cf] font-bold hover:underline">
                    Renvoyer
                  </button>
                </p>
              </div>
            )}

            <div>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-1 text-sm text-[#8127cf] font-semibold hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                {t('auth.forgot.back_to_login')}
              </Link>
            </div>

          </section>

          <AuthVisual
            topBadge={{ icon: 'auto_awesome', label: 'IAAI' }}
            bottomCard={{
              icon: 'travel_explore',
              iconBg: 'bg-[#8127cf]',
              title: "L'avenir de l'apprentissage",
              subtitle: "Rejoignez la révolution de l'IA au Maroc",
            }}
          />

        </div>
      </main>

    </div>
  )
}
