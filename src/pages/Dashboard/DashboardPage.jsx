// src/pages/Dashboard/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { fetchDashboardData } from '@/services/dashboardService'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-purple-100 to-purple-50 ${className}`}
    />
  )
}

// ─── Empty state (aucune activité) ────────────────────────────────────────────

function EmptyActivity() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
      <span className="material-symbols-outlined text-[48px] text-[#cfc2d6]">history</span>
      <p className="text-sm font-medium text-[#7e7385]">{t('dashboard.empty_activity_title')}</p>
      <p className="text-xs text-[#7e7385]">{t('dashboard.empty_activity_subtitle')}</p>
    </div>
  )
}

// ─── Composant : carte stat ───────────────────────────────────────────────────

function StatCard({ stat, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-[#8127cf]/10 shadow-sm rounded-2xl p-6 border-l-4 border-l-purple-100">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-[#8127cf]/10 shadow-sm rounded-2xl p-6 border-l-4 ${stat.border}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${stat.text}`}>{stat.icon}</span>
        </div>
        <div>
          <p className="text-xs text-[#7e7385]">{stat.label}</p>
          <p className="text-xl font-bold text-[#0b1c30]">{stat.value}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Composant : roadmap ──────────────────────────────────────────────────────

function RoadmapItem({ item, isLast }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        {item.status === 'done' && (
          <div className="w-6 h-6 rounded-full bg-[#8127cf] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[14px]">check</span>
          </div>
        )}
        {item.status === 'active' && (
          <div className="w-6 h-6 rounded-full border-2 border-[#8127cf] flex items-center justify-center bg-white">
            <div className="w-2 h-2 rounded-full bg-[#8127cf]" />
          </div>
        )}
        {item.status === 'locked' && (
          <div className="w-6 h-6 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#7e7385]">
            <span className="material-symbols-outlined text-[14px]">lock</span>
          </div>
        )}
        {!isLast && (
          <div
            className={`w-0.5 h-8 mt-1 ${
              item.status === 'locked' ? 'bg-[#e5eeff]' : 'bg-[#8127cf]'
            }`}
          />
        )}
      </div>
      <div className={`pb-4 ${item.status === 'locked' ? 'opacity-40' : ''}`}>
        <p
          className={`text-sm font-bold ${
            item.status === 'active' ? 'text-[#8127cf]' : 'text-[#0b1c30]'
          }`}
        >
          {item.title}
        </p>
        {item.status === 'done' && (
          <p className="text-xs text-[#7e7385] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {t('dashboard.status.done')}
          </p>
        )}
        {item.status === 'active' && (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-24 h-1 bg-[#e5eeff] rounded-full">
              <div
                className="h-full bg-[#8127cf] rounded-full transition-all duration-700"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-[#7e7385]">{t('dashboard.in_progress_percent', { percent: item.progress })}</span>
          </div>
        )}
        {item.status === 'locked' && (
          <p className="text-xs text-[#7e7385]">{t('dashboard.upcoming')}</p>
        )}
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const [loading, setLoading]               = useState(true)
  const [stats, setStats]                   = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [roadmap, setRoadmap]               = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [meta, setMeta]                     = useState({
    overallPercent: 0,
    overallCompleted: 0,
    overallTotal: 0,
    currentModule: null,
    activeModuleProgress: 0,
  })

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'là'

  useEffect(() => {
    if (!user?.id) return

    setLoading(true)
    fetchDashboardData(user.id)
      .then((data) => {
        setStats(data.stats)
        setRecentActivity(data.recentActivity)
        setRoadmap(data.roadmap)
        setRecommendations(data.recommendations)
        setMeta(data.meta)
      })
      .catch((err) => console.error('[Dashboard] load error:', err))
      .finally(() => setLoading(false))
  }, [user?.id])

  // Module en cours pour la carte "Continuer"
  const activeModule = roadmap.find((m) => m.status === 'active') ?? null

  return (
    <div className="min-h-screen pb-12 theme-transition" style={{ background: 'var(--color-bg)' }}>

      {/* ── Row 1 : Welcome Banner + Objectif ───────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6 mb-6">

        {/* Welcome Banner */}
        <div
          className="col-span-12 lg:col-span-7 bg-gradient-to-br from-[#8127cf] to-[#9c48ea]
                     rounded-2xl p-8 text-white relative overflow-hidden shadow-lg"
        >
          <div className="relative z-10">
            <h2 className="text-2xl font-bold font-display mb-2">
              {t('dashboard.greeting', { name: firstName })}
            </h2>
            <p className="text-base opacity-90 mb-6">
              {meta.overallPercent > 0 ? t('dashboard.subtitle') : t('dashboard.welcome_new')}
            </p>

            {/* Barre de progression globale */}
            <div className="mb-6 max-w-sm">
              <div className="flex justify-between text-xs mb-2">
                <span>{t('dashboard.progress_label')}</span>
                {loading ? (
                  <Skeleton className="h-3 w-24 bg-white/30" />
                ) : (
                  <span>{t('dashboard.progress_value', { percent: meta.overallPercent, done: meta.overallCompleted, total: meta.overallTotal })}</span>
                )}
              </div>
              <div className="h-2 w-full bg-white/20 rounded-full">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${loading ? 0 : meta.overallPercent}%` }}
                />
              </div>
            </div>

            <Link
              to={
                activeModule
                  ? `/module/${activeModule.id}`
                  : ROUTES.CURRICULUM
              }
              className="inline-flex items-center gap-2 bg-white text-[#8127cf]
                         px-6 py-3 rounded-full font-bold text-sm hover:bg-purple-50 transition-colors"
            >
              {meta.overallPercent > 0 ? t('dashboard.continue_learning') : t('dashboard.start')}
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            </Link>
          </div>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute right-10 bottom-0 w-48 h-48 opacity-10">
            <span className="material-symbols-outlined text-[180px]">auto_awesome</span>
          </div>
        </div>

        {/* Objectif hebdomadaire */}
        <div
          className="col-span-12 lg:col-span-5 rounded-2xl p-8
                     flex flex-col items-center justify-center text-center
                     glass-card theme-transition"
        >
          <h3 className="text-xl font-bold font-display mb-4" style={{ color: 'var(--color-text)' }}>
            {t('dashboard.weekly_goal_title')}
          </h3>

          {/* Cercle de progression */}
          {loading ? (
            <Skeleton className="w-32 h-32 rounded-full mb-4" />
          ) : (
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64" cy="64" r="58"
                  fill="transparent" stroke="var(--color-border)" strokeWidth="8"
                />
                <circle
                  cx="64" cy="64" r="58"
                  fill="transparent" stroke="var(--color-primary)" strokeWidth="8"
                  strokeDasharray="364.4"
                  strokeDashoffset={364.4 - (364.4 * meta.activeModuleProgress) / 100}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                  {meta.activeModuleProgress}%
                </span>
              </div>
            </div>
          )}

          {activeModule ? (
            <>
              <p className="text-sm font-medium text-[#0b1c30] mb-1">
                {activeModule.title}
              </p>
              <p className="text-xs text-[#7e7385]">
                {activeModule.totalLessons - activeModule.completedLessons > 0
                  ? t('dashboard.lessons_remaining', { count: activeModule.totalLessons - (activeModule.completedLessons ?? 0) })
                  : t('dashboard.ready_for_quiz')}
              </p>
            </>
          ) : (
            <p className="text-sm text-[#7e7385]">
              {meta.overallPercent === 100 ? t('dashboard.all_modules_done') : t('dashboard.start_module_prompt')}
            </p>
          )}
        </div>

      </div>

      {/* ── Row 2 : Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCard key={i} loading />
            ))
          : stats.map((stat, i) => (
              <StatCard key={i} stat={stat} />
            ))}
      </div>

      {/* ── Row 3 : Continuer + Feuille de route ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Carte "Continuer la leçon" */}
        <div className="bg-white border border-[#8127cf]/10 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="h-48 relative bg-gradient-to-br from-purple-400 to-cyan-400">
            <div className="absolute top-4 left-4 bg-[#8127cf] text-white text-[10px]
                            font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {meta.overallPercent === 0 ? t('dashboard.status_new') : t('dashboard.status_in_progress')}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="material-symbols-outlined text-[120px] text-white">
                {meta.overallPercent === 0 ? 'rocket_launch' : 'play_circle'}
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col flex-1">
            {loading ? (
              <div className="flex flex-col gap-3 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <>
                <h4 className="text-lg font-bold text-[#0b1c30] mb-1">
                  {activeModule?.title ?? t('dashboard.default_module_title')}
                </h4>
                <p className="text-xs text-[#7e7385] mb-6">
                  {activeModule
                    ? t('dashboard.lessons_completed_count', { completed: activeModule.completedLessons ?? 0, total: activeModule.totalLessons ?? 0 })
                    : t('dashboard.start_journey_prompt')}
                </p>
              </>
            )}

            <div className="mt-auto">
              <div className="flex justify-between text-xs mb-2">
                <span>{t('dashboard.module_progress_label')}</span>
                <span>{loading ? '...' : `${meta.activeModuleProgress}%`}</span>
              </div>
              <div className="h-1.5 w-full bg-[#e5eeff] rounded-full mb-6">
                <div
                  className="h-full bg-[#8127cf] rounded-full transition-all duration-700"
                  style={{ width: `${loading ? 0 : meta.activeModuleProgress}%` }}
                />
              </div>
              <Link
                to={activeModule ? `/module/${activeModule.id}` : ROUTES.CURRICULUM}
                className="w-full py-3 rounded-xl border border-[#8127cf] text-[#8127cf]
                           font-bold hover:bg-purple-50 transition-colors
                           flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                {meta.overallPercent > 0 ? t('dashboard.continue_lesson') : t('dashboard.start_now')}
              </Link>
            </div>
          </div>
        </div>

        {/* Feuille de route */}
        <div className="bg-white border border-[#8127cf]/10 shadow-sm rounded-2xl p-6">
          <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-6">
            {t('dashboard.roadmap_title')}
          </h3>

          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : roadmap.length > 0 ? (
            <div className="space-y-4">
              {roadmap.map((item, i) => (
                <RoadmapItem key={item.id} item={item} isLast={i === roadmap.length - 1} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#cfc2d6]">map</span>
              <p className="text-sm text-[#7e7385]">{t('dashboard.roadmap_unavailable')}</p>
            </div>
          )}
        </div>

      </div>

      {/* ── Row 4 : Badges + Activité récente ───────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6 mb-6">

        {/* Badges */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#8127cf]/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-6">🏆 {t('dashboard.badges_title')}</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Badge "AI Explorer" débloqué si au moins 1 leçon complétée */}
            <div
              className={`flex flex-col items-center text-center transition-all duration-500 ${
                meta.overallCompleted > 0 ? '' : 'opacity-30 grayscale'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500
                              flex items-center justify-center text-white shadow-md mb-2">
                <span className="material-symbols-outlined text-[32px]">rocket_launch</span>
              </div>
              <p className="text-[10px] font-bold text-[#0b1c30]">{t('dashboard.badge_ai_explorer')}</p>
            </div>
            {/* Badge "Code Starter" débloqué si module 3 commencé */}
            {[
              { icon: 'code',         label: t('dashboard.badge_code_starter'),  unlocked: roadmap.some((m) => m.order_index >= 3 && m.status !== 'locked') },
              { icon: 'emoji_events', label: t('dashboard.badge_quiz_master'),   unlocked: (stats.find((s) => s.label === 'Quiz réussis')?.value ?? '0').replace(/\D/g, '') > 0 },
            ].map((badge, i) => (
              <div
                key={i}
                className={`flex flex-col items-center text-center transition-all duration-500 ${
                  badge.unlocked ? '' : 'opacity-30 grayscale'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#e5eeff] flex items-center justify-center
                                text-[#7e7385] border-2 border-dashed border-[#7e7385]/50 mb-2">
                  <span className="material-symbols-outlined text-[32px]">{badge.icon}</span>
                </div>
                <p className="text-[10px] font-bold text-[#0b1c30]">{badge.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#8127cf]/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-4">📋 {t('dashboard.activity_title')}</h3>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2 ${
                    i < recentActivity.length - 1 ? 'border-b border-[#cfc2d6]/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bg} ${item.text}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0b1c30]">{item.title}</p>
                      <p className="text-xs text-[#7e7385]">{item.time}</p>
                    </div>
                  </div>
                  {item.extra && (
                    <span className={`text-sm ${item.extraClass}`}>{item.extra}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyActivity />
          )}
        </div>

      </div>

      {/* ── Row 5 : Recommandations ──────────────────────────────────────────── */}
      {(loading || recommendations.length > 0) && (
        <div>
          <h3 className="text-xl font-bold font-display text-[#0b1c30] mb-6">
            {t('dashboard.recommendations_title')}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#8127cf]/10 p-6 rounded-2xl flex items-center gap-6"
                  >
                    <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
                    <div className="flex flex-col gap-3 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </div>
                  </div>
                ))
              : recommendations.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#8127cf]/10 p-6 rounded-2xl
                               flex items-center gap-6 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div
                      className={`w-20 h-20 rounded-2xl ${item.bg} flex items-center justify-center ${item.text} flex-shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[40px]">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-[#0b1c30] group-hover:text-[#8127cf] transition-colors mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#7e7385] mb-3">{item.sub}</p>
                      <Link
                        to={item.route || ROUTES.CURRICULUM}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white
                                   text-xs font-bold transition-all"
                        style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
                      >
                        {item.btn}
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

    </div>
  )
}