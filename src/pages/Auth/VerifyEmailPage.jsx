// src/pages/Auth/VerifyEmailPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import AuthHeader from '@/components/ui/AuthHeader'
import AuthVisual from '@/components/ui/AuthVisual'
import OtpInput from '@/components/ui/OtpInput'

const OTP_LENGTH = 8
const RESEND_COOLDOWN = 60 // secondes

function VerifyEmailPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)

  const email = localStorage.getItem('iaai-pending-email') || ''

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleVerify = useCallback(async (code) => {
    if (code.length !== OTP_LENGTH) {
      setError(`Le code doit contenir ${OTP_LENGTH} chiffres.`)
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      })

      if (error) throw error

      await setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || '',
        role: data.user.user_metadata?.role || 'LEARNER',
        isOnboardingComplete: false,
      })

      localStorage.removeItem('iaai-pending-email')
      navigate(ROUTES.ONBOARDING_1)
    } catch {
      setError('Code invalide ou expiré. Vérifie ton email.')
    } finally {
      setIsLoading(false)
    }
  }, [email, navigate, setUser])

  const handleSubmit = (e) => {
    e.preventDefault()
    handleVerify(otp)
  }

  const handleOtpChange = (val) => {
    setOtp(val)
    setError(null)
    if (val.length === OTP_LENGTH) {
      handleVerify(val)
    }
  }

  const handleResend = async () => {
    setError(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setResent(true)
      setCooldown(RESEND_COOLDOWN)
      setTimeout(() => setResent(false), 5000)
    } catch {
      setError('Impossible de renvoyer le code.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5ff] font-sans antialiased">

      <AuthHeader />

      <main className="flex items-center justify-center pb-12 px-2">
        <div className="w-full max-w-[1200px] px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <section className="flex flex-col space-y-8">

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-[#0b1c30] tracking-tight font-display">
                Entrez votre code
              </h1>
              <p className="text-lg text-[#7e7385]">
                Code envoyé à{' '}
                {email && <span className="font-semibold text-[#8127cf]">{email}</span>}
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {resent && (
              <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Code renvoyé avec succès
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <OtpInput length={OTP_LENGTH} value={otp} onChange={handleOtpChange} error={!!error} />

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#f0f0f5] w-fit">
                <span className="material-symbols-outlined text-[18px] text-[#7e7385]">schedule</span>
                <span className="text-sm text-[#4d4354]">
                  {cooldown > 0
                    ? <>Code valide pendant <span className="font-bold text-[#8127cf]">{formatTime(cooldown)}</span></>
                    : 'Le code a expiré'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== OTP_LENGTH}
                className="w-full py-5 rounded-full text-white text-sm font-semibold
                           flex items-center justify-center gap-2
                           transition-all duration-300 active:scale-[0.98]
                           disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
              >
                {isLoading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Vérifier mon code
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-base text-[#4d4354] text-center lg:text-left">
              Vous n'avez pas reçu le code ?{' '}
              <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-[#8127cf] font-bold hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                Renvoyer le code
              </button>
            </p>

          </section>

          <AuthVisual
            topBadge={{ icon: 'shield', label: 'Sécurisé par IAAI' }}
            bottomCard={{
              icon: 'lock',
              iconBg: 'bg-[#8127cf]',
              title: 'Chiffrement de bout en bout',
              subtitle: 'Vos données sont protégées',
            }}
          />

        </div>
      </main>

    </div>
  )
}

export default VerifyEmailPage
