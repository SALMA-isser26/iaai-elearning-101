// src/pages/Learning/ModulePage.jsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { supabase } from '@/services/supabaseClient'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-gradient-to-r from-purple-100 to-purple-50 ${className}`} />
}

export default function ModulePage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [mod, setMod] = useState(null)
  const [lessons, setLessons] = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !user?.id) return
    fetchModule()
  }, [id, user?.id])

  async function fetchModule() {
    setLoading(true)
    try {
      // 1. Module
      const { data: modData } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single()

      // 2. Leçons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', id)
        .order('order_index', { ascending: true })

      // 3. Progression utilisateur
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('module_id', id)
        .eq('completed', true)

      const ids = new Set((progressData || []).map(p => p.lesson_id))

      setMod(modData)
      setLessons(lessonsData || [])
      setCompletedIds(ids)
    } catch (err) {
      console.error('ModulePage error:', err)
    } finally {
      setLoading(false)
    }
  }

  const completedCount = lessons.filter(l => completedIds.has(l.id)).length
  const totalLessons = lessons.length
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const status = progress === 100 ? 'done' : completedCount > 0 ? 'active' : 'active'

  const getLessonStatus = (lesson) => {
    if (completedIds.has(lesson.id)) return 'done'
    // La première leçon non complétée est "active"
    const firstIncomplete = lessons.find(l => !completedIds.has(l.id))
    if (firstIncomplete?.id === lesson.id) return 'active'
    return 'locked'
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">

      {/* ── Retour ────────────────────────────────────────────────────────── */}
      <Link to={ROUTES.CURRICULUM}
        className="inline-flex items-center gap-2 text-[#8127cf] text-sm font-medium hover:gap-3 transition-all mb-6">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Retour au parcours
      </Link>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold font-display text-[#0b1c30] mb-6">
              Module {mod?.order_index} — {mod?.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-2 font-bold">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {status === 'done' ? 'TERMINÉ' : 'EN COURS'}
              </span>
              <div className="flex items-center gap-2 text-[#7e7385] text-sm">
                <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                {totalLessons} leçons
              </div>
              <div className="flex items-center gap-2 text-[#7e7385] text-sm">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                {mod?.duration_minutes} min
              </div>
            </div>
          </>
        )}

        {/* Progression */}
        <div className="bg-white border border-[#8127cf]/10 rounded-2xl p-6">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs text-[#7e7385] uppercase font-bold tracking-wider mb-1">
                Progression du module
              </p>
              {loading ? <Skeleton className="h-4 w-24" /> : (
                <p className="text-sm font-semibold text-[#0b1c30]">
                  {completedCount}/{totalLessons} leçons complétées
                </p>
              )}
            </div>
            <span className="text-2xl font-bold text-[#8127cf]">
              {loading ? '...' : `${progress}%`}
            </span>
          </div>
          <div className="h-3 w-full bg-[#e5eeff] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${loading ? 0 : progress}%`,
                background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Description ───────────────────────────────────────────────────── */}
      {!loading && mod?.description && (
        <section className="mb-10">
          <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-4">
            À propos de ce module
          </h3>
          <div className="bg-white border border-[#8127cf]/10 rounded-2xl p-6">
            <p className="text-sm text-[#4d4354] leading-relaxed">{mod.description}</p>
          </div>
        </section>
      )}

      {/* ── Leçons ────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-6">Les leçons</h3>
        <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#8127cf]/10 rounded-xl p-5 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : (
            lessons.map((lesson, i) => {
              const lessonStatus = getLessonStatus(lesson, i)
              return (
                <div key={lesson.id}
                  className={`bg-white border rounded-xl p-5 flex items-center justify-between transition-all
                              ${lessonStatus === 'locked'
                                ? 'border-[#8127cf]/5 opacity-60'
                                : 'border-[#8127cf]/10 hover:border-[#8127cf]/30'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                    ${lessonStatus === 'done' ? 'bg-green-50'
                                      : lessonStatus === 'active' ? 'bg-[#f0dbff]'
                                      : 'bg-[#e5eeff]'}`}>
                      <span className={`material-symbols-outlined text-[20px]
                                       ${lessonStatus === 'done' ? 'text-green-500'
                                         : lessonStatus === 'active' ? 'text-[#8127cf]'
                                         : 'text-[#7e7385]'}`}>
                        {lessonStatus === 'done' ? 'check_circle'
                          : lessonStatus === 'active' ? 'play_circle'
                          : 'lock'}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold
                                    ${lessonStatus === 'active' ? 'text-[#8127cf]' : 'text-[#0b1c30]'}`}>
                        Leçon {i + 1} — {lesson.title}
                      </p>
                      <p className="text-xs text-[#7e7385]">{lesson.duration_minutes} min</p>
                    </div>
                  </div>

                  {lessonStatus === 'done' && (
                    <Link to={ROUTES.LESSON(lesson.id)}
                      className="px-4 py-1.5 border border-[#8127cf] text-[#8127cf] rounded-lg text-xs font-bold hover:bg-[#8127cf]/5 transition-colors">
                      Revoir
                    </Link>
                  )}
                  {lessonStatus === 'active' && (
                    <Link to={ROUTES.LESSON(lesson.id)}
                      className="px-6 py-2 rounded-lg text-white text-xs font-bold transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}>
                      {completedCount === 0 ? 'Commencer' : 'Continuer'}
                    </Link>
                  )}
                  {lessonStatus === 'locked' && (
                    <span className="material-symbols-outlined text-[#7e7385] text-[20px]">lock</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ── Quiz du module ────────────────────────────────────────────────── */}
      {!loading && (
        <section className="mt-10">
          <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-6">Quiz du module</h3>
          <div className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-6
                          ${progress === 100
                            ? 'bg-white border-[#8127cf]/20'
                            : 'bg-[#f8f5ff] border-[#8127cf]/10'}`}>
            {/* Icône */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
                            ${progress === 100 ? 'bg-[#f0dbff]' : 'bg-[#e5eeff]'}`}>
              <span className={`material-symbols-outlined text-[32px]
                               ${progress === 100 ? 'text-[#8127cf]' : 'text-[#7e7385]'}`}>
                quiz
              </span>
            </div>

            {/* Texte */}
            <div className="flex-1 text-center sm:text-left">
              <p className={`text-base font-bold ${progress === 100 ? 'text-[#0b1c30]' : 'text-[#7e7385]'}`}>
                {progress === 100 ? 'Quiz disponible — testez vos connaissances !' : 'Quiz verrouillé'}
              </p>
              <p className="text-sm text-[#7e7385] mt-1">
                {progress === 100
                  ? 'Vous avez complété toutes les leçons. Validez votre apprentissage avec le quiz.'
                  : `Terminez les ${totalLessons} leçons du module pour débloquer le quiz.`}
              </p>
              {progress > 0 && progress < 100 && (
                <p className="text-xs text-[#8127cf] font-medium mt-2">
                  {completedCount}/{totalLessons} leçons complétées — encore{' '}
                  {totalLessons - completedCount} pour débloquer le quiz.
                </p>
              )}
            </div>

            {/* Bouton */}
            {progress === 100 ? (
              <Link
                to={ROUTES.QUIZ(id)}
                className="flex-shrink-0 flex items-center gap-2 px-8 py-3 rounded-xl text-white
                           font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#8127cf]/20
                           active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                Commencer le quiz
              </Link>
            ) : (
              <div className="flex-shrink-0 flex items-center gap-2 px-8 py-3 rounded-xl
                              bg-[#e5eeff] text-[#7e7385] font-bold text-sm cursor-not-allowed">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Verrouillé
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
