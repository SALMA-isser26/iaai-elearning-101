// src/pages/Quiz/QuizResultPage.jsx
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/store/authStore'
import { checkCertificateEligibility, generateCertificate } from '@/services/certificateService'
import { supabase } from '@/services/supabaseClient'

export default function QuizResultPage() {
  const location = useLocation()
  const { user } = useAuthStore()

  const {
    score        = 0,
    total        = 0,
    scorePercent = 0,
    passed       = false,
    quizTitle    = 'Quiz',
    moduleId     = null,
    passingScore = 80,
    invalidated  = false,
  } = location.state || {}

  const [certGenerated, setCertGenerated] = useState(false)
  const [certLoading, setCertLoading]     = useState(false)
  const [certEligible, setCertEligible]   = useState(false)

  // ── Générer le certificat SEULEMENT si tout le parcours est terminé ────────
  //
  // CORRECTION : auparavant on générait un certificat dès que CE quiz était
  // réussi, sans vérifier les autres modules. Il n'y a qu'un seul certificat
  // pour l'ensemble du cursus : on vérifie d'abord l'éligibilité globale
  // (checkCertificateEligibility), et on ne l'émet que si tous les modules
  // sont complétés.
  useEffect(() => {
    if (invalidated || !passed || !user?.id) return

    const generate = async () => {
      setCertLoading(true)
      try {
        const { eligible } = await checkCertificateEligibility(user.id)
        setCertEligible(eligible)

        if (eligible) {
          await generateCertificate(user.id)
          setCertGenerated(true)

          await supabase.from('user_activity').insert({
            user_id: user.id,
            type: 'certificate',
            title: `Certificat obtenu — parcours complet`,
            detail: `${scorePercent}%`,
          })
        }
      } catch (err) {
        // Certificat déjà existant = pas une erreur bloquante
        setCertGenerated(true)
        console.warn('Certificat:', err?.message)
      } finally {
        setCertLoading(false)
      }
    }

    generate()
  }, [passed, user?.id, quizTitle, scorePercent])

  // ── Animation du score ───────────────────────────────────────────────────────
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    let count = 0
    const target = scorePercent
    const duration = 1500
    const increment = target / (duration / 16)
    const counter = setInterval(() => {
      count += increment
      if (count >= target) {
        setDisplayScore(target)
        clearInterval(counter)
      } else {
        setDisplayScore(Math.floor(count))
      }
    }, 16)
    return () => clearInterval(counter)
  }, [scorePercent])

  // ── Écran dédié : quiz invalidé pour sortie d'onglet/fenêtre ────────────────
  if (invalidated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-2xl bg-white rounded-2xl border border-red-200
                        p-10 md:p-16 flex flex-col items-center text-center relative z-10 shadow-sm">

          <div className="w-32 h-32 flex items-center justify-center rounded-full bg-red-50 mb-8">
            <span className="material-symbols-outlined text-[80px] text-red-500">block</span>
          </div>

          <h2 className="text-3xl font-bold font-display mb-2 text-red-600">
            Quiz invalidé
          </h2>
          <p className="text-lg text-[#7e7385] mb-2 max-w-md">
            Une sortie de l'onglet ou de la fenêtre a été détectée pendant{' '}
            <span className="font-semibold text-[#0b1c30]">{quizTitle}</span>.
          </p>
          <p className="text-sm text-[#a89fb5] mb-10 max-w-md">
            Pour garantir l'intégrité des résultats, le quiz est automatiquement annulé
            dès qu'un changement d'onglet ou d'application est détecté. Cet événement
            a été enregistré.
          </p>

          <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
            <Link
              to={ROUTES.QUIZ(moduleId)}
              className="px-8 py-4 rounded-full text-white font-bold text-sm
                         flex items-center justify-center gap-2
                         hover:shadow-lg active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
            >
              Recommencer le quiz
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </Link>
            <Link
              to={ROUTES.MODULE(moduleId)}
              className="px-8 py-4 border-2 border-[#8127cf]/20 text-[#8127cf]
                         rounded-full font-bold text-sm
                         flex items-center justify-center gap-2
                         hover:bg-[#8127cf]/5 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              Revoir le module
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Cercle SVG ───────────────────────────────────────────────────────────────
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference

  return (
    <div className="min-h-[80vh] flex items-center justify-center relative overflow-hidden">

      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#8127cf]/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#8127cf]/10
                      p-10 md:p-16 flex flex-col items-center text-center relative z-10 shadow-sm">

        {/* Trophée */}
        <div className="relative mb-8">
          <div className={`w-32 h-32 flex items-center justify-center rounded-full
                          ${passed ? 'bg-yellow-50' : 'bg-red-50'}`}>
            <span className={`material-symbols-outlined text-[80px]
                             ${passed ? 'text-yellow-500' : 'text-red-400'}`}>
              {passed ? 'emoji_events' : 'sentiment_dissatisfied'}
            </span>
          </div>
          {passed && (
            <>
              <div className="absolute -top-4 -right-4 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
              <div className="absolute bottom-0 -left-6 w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
            </>
          )}
        </div>

        {/* Titre */}
        <h2 className={`text-3xl font-bold font-display mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>
          {passed ? 'Félicitations !' : 'Presque !'}
        </h2>
        <p className="text-lg text-[#7e7385] mb-4">
          {passed
            ? `Vous avez réussi : ${quizTitle}`
            : `Score minimum requis : ${passingScore}% — Vous avez obtenu ${scorePercent}%`}
        </p>

        {/* Badge certificat — CORRECTION : ne s'affiche que si le parcours */}
        {/* complet est éligible (ou déjà généré), pas à chaque quiz réussi. */}
        {passed && (certLoading || certEligible || certGenerated) && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6
                          ${certGenerated
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-[#f0dbff] text-[#8127cf]'}`}>
            <span className="material-symbols-outlined text-[18px]">
              {certGenerated ? 'verified' : certLoading ? 'hourglass_empty' : 'workspace_premium'}
            </span>
            {certGenerated ? 'Certificat généré !' : certLoading ? 'Vérification...' : 'Certificat disponible'}
          </div>
        )}

        {/* Cercle score */}
        <div className="relative w-48 h-48 mb-10">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#e5eeff" strokeWidth="8" />
            <circle
              cx="96" cy="96" r={radius}
              fill="transparent"
              stroke={passed ? 'url(#scoreGradient)' : '#f87171'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-[#8127cf]">{displayScore}%</span>
            <span className="text-xs text-[#7e7385] uppercase tracking-widest mt-1">Score Final</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 w-full mb-10 border-y border-[#cfc2d6]/20 py-8">
          {[
            { icon: 'task_alt',          value: `${score}/${total}`,                     label: 'Réponses correctes'  },
            { icon: 'workspace_premium', value: passed ? `≥${passingScore}%` : `<${passingScore}%`, label: passed ? 'Seuil atteint' : 'Seuil non atteint' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-[#8127cf] text-[28px] mb-1">{stat.icon}</span>
              <span className="text-2xl font-bold text-[#0b1c30]">{stat.value}</span>
              <span className="text-xs text-[#7e7385]">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Boutons */}
        <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
          {passed ? (
            <>
              <Link
                to={ROUTES.CURRICULUM}
                className="px-8 py-4 rounded-full text-white font-bold text-sm
                           flex items-center justify-center gap-2
                           hover:shadow-lg active:scale-[0.98] transition-all"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
              >
                Continuer l'apprentissage
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              {certGenerated && (
                <Link
                  to={ROUTES.CERTIFICATES}
                  className="px-8 py-4 border-2 border-[#8127cf]/20 text-[#8127cf]
                             rounded-full font-bold text-sm
                             flex items-center justify-center gap-2
                             hover:bg-[#8127cf]/5 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  Voir mon certificat
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to={ROUTES.QUIZ(moduleId)}
                className="px-8 py-4 rounded-full text-white font-bold text-sm
                           flex items-center justify-center gap-2
                           hover:shadow-lg active:scale-[0.98] transition-all"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
              >
                Réessayer le quiz
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </Link>
              <Link
                to={ROUTES.MODULE(moduleId)}
                className="px-8 py-4 border-2 border-[#8127cf]/20 text-[#8127cf]
                           rounded-full font-bold text-sm
                           flex items-center justify-center gap-2
                           hover:bg-[#8127cf]/5 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                Revoir le module
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  )
}