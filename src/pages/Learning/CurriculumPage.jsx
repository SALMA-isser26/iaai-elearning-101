// src/pages/Learning/CurriculumPage.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { supabase } from '@/services/supabaseClient'
import { generateCertificate } from '@/services/certificateService'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-gradient-to-r from-purple-100 to-purple-50 ${className}`} />
}

// ─── Badge de statut ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'done') return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
      <span className="material-symbols-outlined text-[16px]">check_circle</span>
      TERMINÉ
    </div>
  )
  if (status === 'active') return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f0dbff] text-[#8127cf] rounded-full text-xs font-bold">
      <span className="material-symbols-outlined text-[16px]">play_circle</span>
      EN COURS
    </div>
  )
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#e5eeff] text-[#7e7385] rounded-full text-xs font-bold">
      <span className="material-symbols-outlined text-[16px]">lock</span>
      VERROUILLÉ
    </div>
  )
}

export default function CurriculumPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [overallPercent, setOverallPercent] = useState(0)
  const [overallCompleted, setOverallCompleted] = useState(0)
  const [certLoading, setCertLoading] = useState(false)
  const [certError, setCertError] = useState(null)
  const [overallTotal, setOverallTotal] = useState(0)
  // ─── AJOUT : durée totale calculée dynamiquement depuis les modules ────────
  const [totalDuration, setTotalDuration] = useState('')

  useEffect(() => {
    if (!user?.id) return
    fetchCurriculum()
  }, [user?.id])

  async function fetchCurriculum() {
    setLoading(true)
    try {
      // ─── CORRECTION : 3 requêtes en parallèle (étaient séquentielles)
      // Avant : modules → puis leçons → puis progression (3 aller-retours réseau)
      // Après : Promise.all → un seul round-trip de latence pour les 3
      //
      // CORRECTION : leçons filtrées avec .in('module_id', [...])
      // Avant : SELECT * FROM lessons sans filtre → toutes les leçons en mémoire
      // Après : seulement les leçons des modules chargés

      const { data: modulesData, error: modError } = await supabase
        .from('modules')
        .select('*')
        .order('order_index', { ascending: true })

      if (modError) throw modError
      if (!modulesData || modulesData.length === 0) {
        setModules([])
        return
      }

      const moduleIds = modulesData.map(m => m.id)

      // Les leçons et la progression en parallèle, filtrées sur les modules chargés
      const [lessonsRes, progressRes] = await Promise.all([
        supabase
          .from('lessons')
          .select('id, module_id, title, duration_minutes, order_index, is_free')
          // CORRECTION : .in() → seulement les leçons de ces modules, pas toute la table
          .in('module_id', moduleIds)
          .order('order_index', { ascending: true }),
        supabase
          .from('user_progress')
          .select('lesson_id, module_id, completed')
          .eq('user_id', user.id)
          .eq('completed', true),
      ])

      if (lessonsRes.error)  throw lessonsRes.error
      if (progressRes.error) throw progressRes.error

      const lessonsData  = lessonsRes.data  || []
      const progressData = progressRes.data || []

      const completedLessonIds = new Set(progressData.map(p => p.lesson_id))

      // ─── CORRECTION : durée totale calculée depuis la base, pas hardcodée
      const totalMinutes = modulesData.reduce((sum, m) => sum + (m.duration_minutes || 0), 0)
      const hours        = Math.floor(totalMinutes / 60)
      const mins         = totalMinutes % 60
      setTotalDuration(mins > 0 ? `~${hours}h${mins}` : `~${hours}h`)

      let totalCompleted = 0
      let totalLessons   = 0

      const isPremium = user?.plan === 'premium'

      // ── Passe 1 : calculer les données de base (sans statut) ───────────────
      const base = modulesData.map((mod) => {
        const modLessons     = lessonsData.filter(l => l.module_id === mod.id)
        const completedCount = modLessons.filter(l => completedLessonIds.has(l.id)).length
        const total          = modLessons.length
        const percent        = total > 0 ? Math.round((completedCount / total) * 100) : 0

        totalCompleted += completedCount
        totalLessons   += total

        return {
          ...mod,
          lessons:      modLessons,
          completedCount,
          totalLessons: total,
          progress:     percent,
          status:       'locked', // sera recalculé en passe 2
          durationText: `${total} leçons · ~${mod.duration_minutes}min`,
        }
      })

      // ── Passe 2 : calculer le statut (maintenant que base[] est complet) ──
      const enriched = base.map((mod, idx) => {
        const prevModDone    = idx === 0 || (base[idx - 1]?.progress === 100)
        const moduleUnlocked = idx === 0 || (isPremium && prevModDone)

        const status = !moduleUnlocked
          ? 'locked'
          : mod.progress === 100
            ? 'done'
            : 'active'

        return { ...mod, status }
      })

      setModules(enriched)
      setOverallCompleted(totalCompleted)
      setOverallTotal(totalLessons)
      setOverallPercent(
        totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0
      )
    } catch (err) {
      // CORRECTION : erreur visible dans l'UI, pas seulement en console
      console.error('CurriculumPage error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGetCertificate = async () => {
    if (!user?.id || certLoading) return
    setCertLoading(true)
    setCertError(null)
    try {
      await generateCertificate(user.id)
      navigate(ROUTES.CERTIFICATES)
    } catch (err) {
      console.error('Erreur génération certificat:', err)
      setCertError("Impossible de générer le certificat pour le moment. Réessaie dans un instant.")
    } finally {
      setCertLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5ff] pb-12">

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#8127cf]/10 rounded-2xl p-10 relative overflow-hidden mb-10">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#8127cf]/5 rounded-full blur-[80px]" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-[#b4136d]/5 rounded-full blur-[60px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-6 flex-1">
            <div>
              <h2 className="text-4xl font-bold font-display text-[#0b1c30] mb-2 tracking-tight">
                AI Foundations 101
              </h2>
              <p className="text-lg text-[#4d4354]">Votre parcours complet vers la maîtrise de l'IA</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: 'signal_cellular_alt', color: 'text-[#8127cf] bg-[#f0dbff]', label: 'Débutant' },
                { icon: 'category',            color: 'text-cyan-500 bg-cyan-50',     label: `${modules.length || '...'} modules` },
                { icon: 'menu_book',           color: 'text-[#b4136d] bg-pink-50',   label: `${overallTotal || '...'} leçons` },
                // CORRECTION : durée calculée dynamiquement depuis modules.duration_minutes
                { icon: 'schedule',            color: 'text-[#4d4354] bg-[#e5eeff]', label: loading ? '...' : totalDuration },
              ].map((badge, i) => (
                <span key={i} className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 ${badge.color}`}>
                  <span className="material-symbols-outlined text-[16px]">{badge.icon}</span>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          {/* Progression globale */}
          <div className="w-full md:w-96 space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-xs text-[#7e7385] uppercase font-bold tracking-wider">Progression globale</p>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <p className="text-sm font-semibold text-[#0b1c30]">
                    {overallPercent}% complété
                    <span className="text-[#7e7385] font-normal"> · {overallCompleted}/{overallTotal} leçons</span>
                  </p>
                )}
              </div>
              <span className="text-2xl font-bold text-[#8127cf]">
                {loading ? '...' : `${overallPercent}%`}
              </span>
            </div>
            <div className="h-3 w-full bg-[#e5eeff] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${loading ? 0 : overallPercent}%`,
                  background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Liste des modules ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#8127cf]/10 rounded-2xl p-8">
              <Skeleton className="h-6 w-2/3 mb-4" />
              <Skeleton className="h-4 w-1/3 mb-6" />
              <div className="space-y-3 mb-6">
                {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : (
          modules.map((mod) => (
            <div
              key={mod.id}
              className={`bg-white border rounded-2xl p-8 shadow-sm transition-all
                          ${mod.status === 'locked'
                            ? 'opacity-70 border-[#8127cf]/5'
                            : 'border-[#8127cf]/10 hover:border-[#8127cf]/30'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`text-xl font-bold font-display mb-1
                                  ${mod.status === 'locked' ? 'text-[#0b1c30]/60' : 'text-[#0b1c30]'}`}>
                    Module {mod.order_index} — {mod.title}
                  </h3>
                  <p className="text-sm text-[#7e7385]">{mod.durationText}</p>
                </div>
                <StatusBadge status={mod.status} />
              </div>

              <div className={`space-y-3 mb-8 ${mod.status === 'locked' ? 'opacity-40' : ''}`}>
                {mod.lessons.map((lesson, i) => {
                  const isDone = mod.status === 'done' ||
                    (mod.completedCount > i && mod.status !== 'locked')
                  return (
                    <div key={lesson.id} className="flex items-center gap-3 text-[#4d4354]">
                      <span className={`material-symbols-outlined text-[20px]
                                       ${isDone ? 'text-green-500'
                                         : mod.status === 'locked' ? 'text-[#7e7385]'
                                         : 'text-[#cfc2d6]'}`}>
                        {isDone ? 'check_circle' : mod.status === 'locked' ? 'lock' : 'radio_button_unchecked'}
                      </span>
                      <span className="text-sm">{lesson.title}</span>
                      <span className="text-xs text-[#7e7385] ml-auto">{lesson.duration_minutes} min</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                  <div className="h-2 w-full bg-[#e5eeff] rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${mod.status === 'done' ? 'bg-green-500' : 'bg-[#8127cf]'}`}
                      style={{ width: `${mod.progress}%` }}
                    />
                  </div>
                  {mod.status === 'done'   && <p className="text-xs text-green-600 font-bold uppercase">100% complété</p>}
                  {mod.status === 'active' && <p className="text-xs text-[#8127cf] font-bold uppercase">{mod.progress}% complété</p>}
                  {mod.status === 'locked' && (
                    <p className="text-xs text-[#7e7385]/70 font-bold uppercase">
                      {user?.plan !== 'premium'
                        ? '🔒 Passez au plan Premium pour débloquer'
                        : 'Terminez le module précédent pour débloquer'}
                    </p>
                  )}
                </div>

                {mod.status === 'done' && (
                  <Link to={ROUTES.MODULE(mod.id)}
                    className="px-6 py-2.5 border-2 border-[#8127cf] text-[#8127cf] rounded-xl font-bold text-sm hover:bg-[#8127cf]/5 transition-colors whitespace-nowrap">
                    Revoir le module
                  </Link>
                )}
                {mod.status === 'active' && (
                  <Link to={ROUTES.MODULE(mod.id)}
                    className="px-8 py-2.5 rounded-xl text-white font-bold text-sm whitespace-nowrap transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}>
                    Continuer
                  </Link>
                )}
                {mod.status === 'locked' && (
                  user?.plan !== 'premium' ? (
                    <Link to={ROUTES.UPGRADE}
                      className="px-8 py-2.5 rounded-xl text-white font-bold text-sm whitespace-nowrap transition-all hover:shadow-lg flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}>
                      <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                      Passer Premium
                    </Link>
                  ) : (
                    <button disabled
                      className="px-8 py-2.5 bg-[#e5eeff] text-[#7e7385]/50 rounded-xl font-bold text-sm cursor-not-allowed whitespace-nowrap flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      Terminez le module précédent
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Section Certificat ─────────────────────────────────────────────── */}
      <div className="mt-8 bg-[#eff4ff] rounded-2xl p-8 border border-[#8127cf]/5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[32px] text-[#8127cf]">workspace_premium</span>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold font-display text-[#0b1c30]">Certificat AI Foundations 101</h3>
              <p className="text-sm text-[#4d4354]">Terminez tous les modules pour obtenir votre certificat reconnu</p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex flex-wrap justify-center gap-6 text-[#4d4354] text-sm">
              {['Tous les modules complétés', 'Toutes les leçons terminées', 'Partageable sur LinkedIn'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">{i === 2 ? 'share' : 'check_circle'}</span>
                  {item}
                </div>
              ))}
            </div>
            <button
              onClick={handleGetCertificate}
              disabled={overallPercent < 100 || certLoading}
              className={`px-8 py-3 border-2 rounded-xl font-bold text-sm flex items-center gap-2
                          ${overallPercent === 100
                            ? 'border-[#8127cf] text-[#8127cf] hover:bg-[#8127cf]/5 cursor-pointer'
                            : 'border-[#7e7385] text-[#7e7385] cursor-not-allowed'}`}>
              {certLoading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#8127cf] border-t-transparent" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              )}
              {overallPercent === 100 ? 'Obtenir mon certificat' : 'Voir mon certificat'}
            </button>
            {certError && (
              <p className="text-xs text-red-500 max-w-xs text-center md:text-right">{certError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
