import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import brainImg from '@/assets/onboarding-brain.png'
import Logo from '@/components/ui/Logo'

const STORAGE_KEY = 'iaai-onboarding-answers'

const OBJECTIVES = [
  { id: 'career',    icon: 'rocket_launch', label: 'Changer de carrière' },
  { id: 'curiosity', icon: 'bookmark',      label: 'Apprendre par curiosité' },
  { id: 'work',      icon: 'build',         label: 'Améliorer mon travail' },
  { id: 'certificate', icon: 'school',      label: 'Obtenir un certificat' },
]

const TIME_OPTIONS = [
  { id: '15min', icon: 'schedule',    value: '15 min', label: 'Par jour' },
  { id: '30min', icon: 'timer',       value: '30 min', label: 'Par jour' },
  { id: '1h',    icon: 'bolt',        value: '1h',      label: 'Par jour' },
  { id: 'flex',  icon: 'auto_awesome', value: 'A mon rythme', label: 'Flexible' },
]

// Estimation grossière du nombre de semaines pour finir le parcours (38 leçons, ~15 min chacune)
const WEEKS_ESTIMATE = {
  '15min': 10,
  '30min': 5,
  '1h': 3,
  flex: null,
}

function loadAnswers() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveAnswers(answers) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
}

function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current ? 'w-3 h-3 bg-[#8127cf]' : 'w-2 h-2 bg-[#ded6f3]'
          }`}
        />
      ))}
    </div>
  )
}

function StepNumbers({ total, current }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                        ${i < current ? 'bg-green-500 text-white'
                          : i === current ? 'bg-[#8127cf] text-white'
                          : 'bg-[#f0dbff] text-[#a89fb5]'}`}
          >
            {i < current
              ? <span className="material-symbols-outlined text-[18px]">check</span>
              : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-0.5 ${i < current ? 'bg-green-500' : 'bg-[#ded6f3]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Étape 1 : Bienvenue ────────────────────────────────────────────────────
function StepWelcome({ onNext, onSkip }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-16"
         style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 45%, #cffafe 100%)' }}>
      <Link to={ROUTES.HOME} className="fixed top-6 left-6 z-20 hover:opacity-80 transition-opacity">
        <Logo size="sm" />
      </Link>

      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-[#8127cf]/25 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] bg-cyan-300/30 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#ec4899]/15 blur-[90px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <StepDots total={3} current={0} />
          <p className="text-sm font-semibold text-[#7e7385]">Étape 1 sur 3</p>
        </div>

        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <div className="absolute inset-4 rounded-full bg-[#8127cf]/30 blur-2xl animate-pulse-slow" />
          <span className="absolute top-6 -right-3 w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="absolute bottom-6 -left-4 w-3 h-3 rounded-full bg-[#8127cf]" />
          <span className="absolute top-1/2 -left-7 w-2.5 h-2.5 rounded-full bg-pink-400" />
          <div className="relative w-full h-full animate-sway">
            <div className="w-full h-full animate-float">
              <img
                src={brainImg}
                alt="IA - IAAI e-learning 101"
                className="w-full h-full object-cover rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold font-display tracking-tight text-[#0b1c30] leading-[1.1]">
            Bienvenue sur{' '}
            <span style={{ background: 'linear-gradient(135deg, #8127cf 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              IAAI e-learning 101
            </span>{' '}!
          </h1>
          <p className="text-lg text-[#7e7385]">
            La plateforme marocaine pour apprendre l'IA de zéro
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: 'grid_view', label: '7 modules', bg: '#f0dbff', color: '#8127cf' },
            { icon: 'menu_book', label: '38 leçons', bg: '#fce7f3', color: '#ec4899' },
            { icon: 'verified',  label: 'Certifié',  bg: '#e0f7fa', color: '#0891b2' },
          ].map((chip) => (
            <span
              key={chip.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: chip.bg, color: chip.color }}
            >
              <span className="material-symbols-outlined text-[18px]">{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={onNext}
            className="w-full max-w-xs py-4 rounded-full text-white text-sm font-bold
                       flex items-center justify-center gap-2
                       transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
          >
            Commencer
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button onClick={onSkip} className="text-sm text-[#7e7385] hover:text-[#8127cf] transition-colors">
            Passer l'introduction
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Étape 2 : Objectif ─────────────────────────────────────────────────────
function StepObjective({ value, onChange, onNext, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[#f8f5ff]">
      <Link to={ROUTES.HOME} className="fixed top-6 left-6 z-20 hover:opacity-80 transition-opacity">
        <Logo size="sm" />
      </Link>

      <div className="w-full max-w-xl flex flex-col items-center text-center gap-8">

        <div className="flex flex-col items-center gap-3">
          <StepNumbers total={3} current={1} />
          <p className="text-sm font-semibold text-[#7e7385]">Étape 2 sur 3</p>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-[#0b1c30]">
            Quel est votre objectif ?
          </h1>
          <p className="text-[#7e7385] max-w-md">
            Cela nous aide à personnaliser votre parcours d'apprentissage en intelligence artificielle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {OBJECTIVES.map((opt) => {
            const selected = value === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className={`relative flex flex-col items-start gap-4 p-7 min-h-[140px] rounded-2xl border-2 text-left
                            transition-all duration-200 hover:-translate-y-0.5
                            ${selected ? 'border-[#8127cf] bg-white shadow-lg shadow-[#8127cf]/10' : 'border-[#f0f0f5] bg-white hover:border-[#8127cf]/30'}`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: selected ? '#8127cf' : '#eef1ff' }}
                >
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{ color: selected ? '#ffffff' : '#6366f1' }}
                  >
                    {opt.icon}
                  </span>
                </div>
                <span className="font-bold text-[#0b1c30] text-base">{opt.label}</span>
                {selected && (
                  <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#8127cf] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={onNext}
            disabled={!value}
            className="w-full max-w-xs py-4 rounded-full text-white text-sm font-bold
                       flex items-center justify-center gap-2
                       transition-all duration-300 hover:shadow-lg active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
          >
            Continuer
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#7e7385] hover:text-[#8127cf] transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Étape 3 : Temps hebdomadaire ───────────────────────────────────────────
function StepTime({ value, onChange, onFinish, onBack }) {
  const weeks = value ? WEEKS_ESTIMATE[value] : null

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[#f8f5ff]">
      <Link to={ROUTES.HOME} className="fixed top-6 left-6 z-20 hover:opacity-80 transition-opacity">
        <Logo size="sm" />
      </Link>

      <div className="w-full max-w-xl flex flex-col items-center text-center gap-8">

        <div className="flex flex-col items-center gap-3">
          <StepNumbers total={3} current={2} />
          <p className="text-sm font-semibold text-[#7e7385]">Étape 3 sur 3</p>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-[#0b1c30]">
            Combien de temps par semaine ?
          </h1>
          <p className="text-[#7e7385]">Nous adapterons votre objectif hebdomadaire</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          {TIME_OPTIONS.map((opt) => {
            const selected = value === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className={`relative flex flex-col items-center gap-2 p-7 min-h-[140px] justify-center rounded-2xl border-2
                            transition-all duration-200 hover:-translate-y-0.5
                            ${selected ? 'border-[#8127cf] bg-white shadow-lg shadow-[#8127cf]/10' : 'border-[#f0f0f5] bg-white hover:border-[#8127cf]/30'}`}
              >
                {selected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#8127cf] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </span>
                )}
                <span className="material-symbols-outlined text-[30px]" style={{ color: selected ? '#8127cf' : '#a89fb5' }}>
                  {opt.icon}
                </span>
                <span className="text-2xl font-bold text-[#0b1c30]">{opt.value}</span>
                <span className="text-xs text-[#7e7385]">{opt.label}</span>
              </button>
            )
          })}
        </div>

        {value && (
          <div className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[#f0dbff]/60 border border-[#8127cf]/10 text-left">
            <div className="w-11 h-11 rounded-xl bg-[#f0dbff] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#8127cf] text-[22px]">calendar_month</span>
            </div>
            <div>
              <p className="font-bold text-[#0b1c30]">
                Votre objectif : {TIME_OPTIONS.find((o) => o.id === value)?.value} / jour
              </p>
              <p className="text-sm text-[#7e7385]">
                {weeks
                  ? <>Vous terminerez <span className="font-semibold text-[#8127cf]">AI Foundations 101</span> en environ {weeks} semaines</>
                  : "Progressez à votre propre rythme, sans pression"}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={onFinish}
            disabled={!value}
            className="w-full max-w-xs py-4 rounded-full text-white text-sm font-bold
                       flex items-center justify-center gap-2
                       transition-all duration-300 hover:shadow-lg active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
          >
            Démarrer mon parcours
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#7e7385] hover:text-[#8127cf] transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Orchestrateur ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [answers, setAnswers] = useState(loadAnswers)

  useEffect(() => { saveAnswers(answers) }, [answers])

  const stepIndex = [ROUTES.ONBOARDING_1, ROUTES.ONBOARDING_2, ROUTES.ONBOARDING_3].indexOf(pathname)

  const setObjective = (id) => setAnswers((a) => ({ ...a, objective: id }))
  const setTime = (id) => setAnswers((a) => ({ ...a, time: id }))

  const finish = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    navigate(ROUTES.DASHBOARD)
  }

  if (stepIndex === 0) {
    return <StepWelcome onNext={() => navigate(ROUTES.ONBOARDING_2)} onSkip={finish} />
  }
  if (stepIndex === 1) {
    return (
      <StepObjective
        value={answers.objective}
        onChange={setObjective}
        onNext={() => navigate(ROUTES.ONBOARDING_3)}
        onBack={() => navigate(ROUTES.ONBOARDING_1)}
      />
    )
  }
  return (
    <StepTime
      value={answers.time}
      onChange={setTime}
      onFinish={finish}
      onBack={() => navigate(ROUTES.ONBOARDING_2)}
    />
  )
}
