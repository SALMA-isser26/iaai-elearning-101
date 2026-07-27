// src/pages/Catalogue/CataloguePage.jsx
// But : page de découverte publique de tous les modules de la plateforme,
// avec recherche + filtre gratuit/premium, indépendante de "Mon Parcours"
// (qui elle affiche la progression séquentielle verrouillée).

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { supabase } from '@/services/supabaseClient'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-gradient-to-r from-purple-100 to-purple-50 ${className}`} />
}

function ModuleCard({ mod, isPremiumUser, t }) {
  const isLocked = mod.is_premium && !isPremiumUser
  const progress = mod.progress || 0

  let ctaLabel = t('catalogue.start_button')
  if (isLocked) ctaLabel = t('catalogue.unlock_button')
  else if (progress === 100) ctaLabel = t('catalogue.review_button')
  else if (progress > 0) ctaLabel = t('catalogue.continue_button')

  const ctaTo = isLocked ? ROUTES.UPGRADE : `/module/${mod.id}`

  return (
    <div className="bg-white border border-[#8127cf]/10 rounded-2xl p-6 shadow-sm hover:border-[#8127cf]/30 hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isLocked ? 'lock' : 'auto_stories'}
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
            mod.is_premium ? 'bg-[#f0dbff] text-[#8127cf]' : 'bg-green-50 text-green-600'
          }`}
        >
          {mod.is_premium ? t('catalogue.premium_badge') : t('catalogue.free_badge')}
        </span>
      </div>

      <h3 className="text-lg font-bold font-display text-[#0b1c30] mb-2 leading-snug">
        {mod.title}
      </h3>
      {mod.description && (
        <p className="text-sm text-[#7e7385] mb-4 line-clamp-2">{mod.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-[#7e7385] mb-5 mt-auto">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          {t('catalogue.lessons_count', { count: mod.lessonCount })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          {t('catalogue.duration', { duration: mod.duration_minutes || 0 })}
        </span>
      </div>

      {progress > 0 && !isLocked && (
        <div className="mb-4">
          <div className="h-1.5 w-full bg-[#e5eeff] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-[#8127cf]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Link
        to={ctaTo}
        className={`w-full py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
          isLocked ? 'bg-[#f0dbff] text-[#8127cf]' : 'text-white'
        }`}
        style={!isLocked ? { background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' } : {}}
      >
        {ctaLabel}
        <span className="material-symbols-outlined text-[16px]">
          {isLocked ? 'lock' : 'arrow_forward'}
        </span>
      </Link>
    </div>
  )
}

export default function CataloguePage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | free | premium

  const isPremiumUser = user?.plan === 'premium'

  useEffect(() => {
    fetchCatalogue()
  }, [user?.id])

  async function fetchCatalogue() {
    setLoading(true)
    try {
      const { data: modulesData, error: modError } = await supabase
        .from('modules')
        .select('*')
        .order('order_index', { ascending: true })

      if (modError) throw modError

      const moduleIds = (modulesData || []).map((m) => m.id)

      const { data: lessonsData, error: lessonsError } = moduleIds.length
        ? await supabase
            .from('lessons')
            .select('id, module_id')
            .in('module_id', moduleIds)
        : { data: [], error: null }

      if (lessonsError) throw lessonsError

      let completedLessonIds = new Set()
      if (user?.id && moduleIds.length) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('completed', true)
        completedLessonIds = new Set((progressData || []).map((p) => p.lesson_id))
      }

      const enriched = (modulesData || []).map((mod) => {
        const modLessons = (lessonsData || []).filter((l) => l.module_id === mod.id)
        const completedCount = modLessons.filter((l) => completedLessonIds.has(l.id)).length
        const progress = modLessons.length
          ? Math.round((completedCount / modLessons.length) * 100)
          : 0

        return {
          ...mod,
          lessonCount: modLessons.length,
          progress,
        }
      })

      setModules(enriched)
    } catch (err) {
      console.error('CataloguePage error:', err)
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return modules.filter((mod) => {
      const matchesSearch = mod.title?.toLowerCase().includes(search.toLowerCase())
      const matchesFilter =
        filter === 'all' ||
        (filter === 'free' && !mod.is_premium) ||
        (filter === 'premium' && !!mod.is_premium)
      return matchesSearch && matchesFilter
    })
  }, [modules, search, filter])

  return (
    <div className="min-h-screen bg-[#f8f5ff] pb-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#8127cf]/10 rounded-2xl p-10 relative overflow-hidden mb-10">
        <div className="absolute -end-20 -top-20 w-80 h-80 bg-[#8127cf]/5 rounded-full blur-[80px]" />
        <div className="relative z-10 space-y-2">
          <h2 className="text-4xl font-bold font-display text-[#0b1c30] tracking-tight">
            {t('catalogue.title')}
          </h2>
          <p className="text-lg text-[#4d4354]">{t('catalogue.subtitle')}</p>
        </div>
      </section>

      {/* ── Recherche + filtres ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex items-center bg-white px-4 py-3 rounded-full flex-1 border border-[#cfc2d6]/30 gap-2 focus-within:border-[#8127cf]/40 transition-colors">
          <span className="material-symbols-outlined text-[20px] text-[#7e7385]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('catalogue.search_placeholder')}
            className="bg-transparent border-none focus:outline-none text-sm text-[#0b1c30] placeholder:text-[#7e7385] w-full"
          />
        </div>

        <div className="flex gap-2">
          {[
            { key: 'all', label: t('catalogue.filter_all') },
            { key: 'free', label: t('catalogue.filter_free') },
            { key: 'premium', label: t('catalogue.filter_premium') },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'text-white'
                  : 'bg-white text-[#4d4354] border border-[#cfc2d6]/30 hover:border-[#8127cf]/30'
              }`}
              style={filter === f.key ? { background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grille des modules ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#8127cf]/10 rounded-2xl p-6">
              <Skeleton className="h-12 w-12 rounded-xl mb-4" />
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-10 w-full rounded-full mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#8127cf]/10 rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#cfc2d6] mb-4">
            {modules.length === 0 ? 'inventory_2' : 'search_off'}
          </span>
          <p className="text-[#4d4354] font-semibold mb-1">
            {modules.length === 0 ? t('catalogue.empty_title') : t('catalogue.empty_state')}
          </p>
          {modules.length === 0 && (
            <p className="text-sm text-[#7e7385]">{t('catalogue.empty_subtitle')}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} isPremiumUser={isPremiumUser} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
