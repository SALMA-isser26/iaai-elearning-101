// src/pages/Quiz/QuizPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/store/authStore'
import { getQuizByModule, submitQuizAttempt, getBestScore } from '@/services/quizService'
import { logProctoringViolation } from '@/services/proctoringService'
import { useTabSwitchDetection } from '@/hooks/useTabSwitchDetection'
import { supabase } from '@/services/supabaseClient'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function QuizSkeleton() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-10 border border-[#8127cf]/10 animate-pulse">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-[#e5eeff]" />
          <div className="h-8 w-72 bg-[#e5eeff] rounded" />
          <div className="h-5 w-48 bg-[#e5eeff] rounded" />
          <div className="flex gap-8 mt-4">
            {[1,2,3,4].map(i => <div key={i} className="h-10 w-16 bg-[#e5eeff] rounded" />)}
          </div>
          <div className="h-14 w-full bg-[#e5eeff] rounded-xl mt-4" />
        </div>
      </div>
    </div>
  )
}

export default function QuizPage() {
  const { id } = useParams()           // id = moduleId
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [quiz, setQuiz]           = useState(null)
  const [bestScore, setBestScore] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Phase : 'intro' | 'questions' | 'submitting'
  const [phase, setPhase]         = useState('intro')
  const [currentQ, setCurrentQ]   = useState(0)
  const [selected, setSelected]   = useState(null)
  const [answers, setAnswers]     = useState([])   // [{ questionId, answerId }]

  // Timer
  const [timeLeft, setTimeLeft]   = useState(0)
  const timerRef                  = useRef(null)
  // Refs pour capturer les valeurs courantes dans le timer (évite le stale closure)
  const answersRef                = useRef([])
  const selectedRef               = useRef(null)
  // Guard anti-double soumission : le timer et handleNext peuvent appeler
  // handleFinish quasi-simultanément (ex : timer expire pendant le clic "Terminer").
  // Ce ref bloque toute soumission supplémentaire une fois la première lancée.
  const isSubmittingRef           = useRef(false)

  // ── Anti-triche : invalidation immédiate si sortie d'onglet/fenêtre ────────
  // Actif uniquement pendant la phase de questions (pas sur l'intro/résultat).
  const handleViolation = useCallback((violationType) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    clearInterval(timerRef.current)

    // Journalisation best-effort : ne bloque jamais la redirection
    logProctoringViolation(user?.id, quiz?.id, id, violationType)

    navigate(ROUTES.QUIZ_RESULT(quiz?.id ?? id), {
      replace: true,
      state: {
        invalidated: true,
        quizTitle: quiz?.title || 'ce quiz',
        moduleId: id,
      },
    })
  }, [user?.id, quiz, id, navigate])

  useTabSwitchDetection(phase === 'questions', handleViolation)

  // ── Charger le quiz du module ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    setLoading(true)

    const load = async () => {
      try {
        const quizData = await getQuizByModule(id)
        setQuiz(quizData)
        setTimeLeft((quizData.questions?.length || 5) * 60) // 1 min par question

        if (user?.id) {
          const best = await getBestScore(user.id, quizData.id)
          setBestScore(best)
        }
      } catch (err) {
        console.error('Erreur chargement quiz:', err)
        setError('Impossible de charger ce quiz.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user?.id])

  // Synchroniser les refs quand les valeurs changent (jamais pendant le render)
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { selectedRef.current = selected }, [selected])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleStart = () => setPhase('questions')

  const handleAnswer = (answerId) => setSelected(answerId)

  const handleFinish = useCallback(async (finalAnswers) => {
    // Bloquer toute soumission simultanée (timer + clic "Terminer" en même temps)
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    clearInterval(timerRef.current)
    setPhase('submitting')

    try {
      const result = await submitQuizAttempt(user.id, quiz.id, id, finalAnswers, quiz.passing_score)

      // Logger l'activité
      await supabase.from('user_activity').insert({
        user_id: user.id,
        type: 'quiz',
        title: `Quiz terminé — ${quiz.title}`,
        detail: `${result.score}%`,
      })

      // Naviguer vers les résultats
      navigate(ROUTES.QUIZ_RESULT(quiz.id), {
        state: {
          score: result.correct,
          total: result.total,
          scorePercent: result.score,
          passed: result.passed,
          quizTitle: quiz.title,
          moduleId: id,
          passingScore: quiz.passing_score,
        }
      })
    } catch (err) {
      console.error('Erreur soumission quiz:', err)
      // Réinitialiser le guard pour permettre une nouvelle tentative
      isSubmittingRef.current = false
      setPhase('questions')
    }
  }, [user?.id, quiz, id, navigate])

  const handleNext = () => {
    const question = quiz.questions[currentQ]
    const newAnswers = [...answers, { questionId: question.id, answerId: selected }]

    if (currentQ + 1 >= quiz.questions.length) {
      handleFinish(newAnswers)
    } else {
      setAnswers(newAnswers)
      setCurrentQ(currentQ + 1)
      setSelected(null)
    }
  }

  // ── Timer (démarre quand phase = questions) ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'questions') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleFinish([...answersRef.current, { questionId: null, answerId: selectedRef.current }])
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, handleFinish])

  // ── Format timer ─────────────────────────────────────────────────────────────
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const timerColor = timeLeft < 30 ? 'text-red-500' : 'text-[#8127cf]'

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  if (loading) return <QuizSkeleton />

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <span className="material-symbols-outlined text-[60px] text-[#cfc2d6]">error</span>
      <p className="text-[#7e7385]">{error}</p>
      <Link to={ROUTES.CURRICULUM} className="text-[#8127cf] font-bold hover:underline">
        Retour au curriculum
      </Link>
    </div>
  )

  if (!quiz) return null

  const totalQuestions = quiz.questions?.length || 0

  // ── Phase : Submitting ────────────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-[#f0dbff] flex items-center justify-center animate-spin">
            <span className="material-symbols-outlined text-[#8127cf] text-[32px]">hourglass_empty</span>
          </div>
          <p className="text-[#0b1c30] font-bold text-lg">Calcul de votre score...</p>
        </div>
      </div>
    )
  }

  // ── Phase : Intro ─────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center relative">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#8127cf]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[10%] w-80 h-80 bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-2xl bg-white rounded-2xl p-10 border border-[#8127cf]/10 shadow-sm relative z-10">
          <div className="flex flex-col items-center text-center">

            {/* Icône */}
            <div className="w-16 h-16 bg-[#f0dbff] rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#8127cf] text-[32px]">quiz</span>
            </div>

            {/* Titre */}
            <h1 className="text-3xl font-bold font-display text-[#0b1c30] mb-2">{quiz.title}</h1>
            <p className="text-lg text-[#7e7385] mb-8">Testez vos connaissances sur ce module</p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8 w-full">
              {[
                { value: totalQuestions,          label: 'questions'    },
                { value: totalQuestions,           label: 'minutes'      },
                { value: `${quiz.passing_score}%`, label: 'pour réussir' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-[#8127cf]">{stat.value}</span>
                  <span className="text-xs text-[#7e7385] uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Meilleur score précédent */}
            {bestScore && (
              <div className="w-full mb-6 px-6 py-3 bg-[#f0dbff] rounded-xl flex items-center justify-between">
                <span className="text-sm text-[#4d4354]">Votre meilleur score</span>
                <span className={`font-bold text-sm flex items-center gap-1 ${bestScore.passed ? 'text-green-600' : 'text-[#8127cf]'}`}>
                  {bestScore.score}%{' '}
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {bestScore.passed ? 'check_circle' : 'cancel'}
                  </span>
                  {bestScore.passed ? 'Réussi' : 'Échoué'}
                </span>
              </div>
            )}

            <hr className="w-full border-[#f0f0f5] mb-8" />

            {/* Info list */}
            <ul className="w-full space-y-4 mb-10 text-left px-4">
              {[
                'Questions à choix multiple',
                'Une question à la fois',
                `Score minimum requis : ${quiz.passing_score}%`,
                'Résultat immédiat à la fin',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-[#4d4354]">
                  <div className="w-6 h-6 bg-[#f0dbff] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-[#8127cf]">check_circle</span>
                  </div>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>

            {/* Bouton commencer */}
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-xl text-white text-lg font-bold
                         shadow-lg transition-all active:scale-[0.98] mb-4"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
            >
              Commencer le quiz
            </button>

            <Link
              to={ROUTES.MODULE(id)}
              className="flex items-center gap-2 text-[#8127cf] text-sm font-medium hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Retour au module
            </Link>

          </div>
        </div>
      </div>
    )
  }

  // ── Phase : Questions ─────────────────────────────────────────────────────────
  const question  = quiz.questions[currentQ]
  const progress  = (currentQ / totalQuestions) * 100

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-[#7e7385]">
            Question {currentQ + 1} / {totalQuestions}
          </span>
          <div className={`flex items-center gap-2 text-sm font-bold ${timerColor}`}>
            <span className="material-symbols-outlined text-[18px]">timer</span>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="h-2 w-full bg-[#e5eeff] rounded-full overflow-hidden mb-8">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
            }}
          />
        </div>

        {/* Card question */}
        <div className="bg-white rounded-2xl p-8 border border-[#8127cf]/10 shadow-sm mb-6">
          <h2 className="text-xl font-bold font-display text-[#0b1c30] mb-8">
            {question.question_text}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {question.answers?.map((answer, i) => (
              <button
                key={answer.id}
                onClick={() => handleAnswer(answer.id)}
                className={`w-full text-left px-6 py-4 rounded-xl border-2 text-sm
                            font-medium transition-all
                            ${selected === answer.id
                              ? 'border-[#8127cf] bg-[#f0dbff] text-[#8127cf]'
                              : 'border-[#f0f0f5] bg-white text-[#4d4354] hover:border-[#8127cf]/30 hover:bg-[#f0dbff]/20'
                            }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center
                                   text-sm font-bold flex-shrink-0 border-2
                                   ${selected === answer.id
                                     ? 'border-[#8127cf] bg-[#8127cf] text-white'
                                     : 'border-[#cfc2d6] text-[#7e7385]'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {answer.answer_text}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bouton suivant */}
        <button
          onClick={handleNext}
          disabled={selected === null}
          className="w-full py-4 rounded-xl text-white font-bold transition-all
                     active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
        >
          {currentQ + 1 >= totalQuestions ? 'Terminer le quiz' : 'Question suivante'}
          <span className="material-symbols-outlined text-[18px] ml-2 align-middle">
            arrow_forward
          </span>
        </button>

      </div>
    </div>
  )
}