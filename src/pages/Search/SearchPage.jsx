// src/pages/Search/SearchPage.jsx
import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { ROUTES } from '@/constants/routes'
import { formatDuration } from '@/utils'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SearchSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-4 border border-[#f0f0f5]">
          <div className="w-12 h-12 rounded-xl bg-[#e5eeff] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#e5eeff] rounded w-2/3" />
            <div className="h-3 bg-[#e5eeff] rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Résultat module ─────────────────────────────────────────────────────────
function ModuleResult({ module }) {
  const levelColor = {
    'débutant':       'bg-green-50 text-green-700',
    'intermédiaire':  'bg-yellow-50 text-yellow-700',
    'avancé':         'bg-red-50 text-red-700',
  }[module.level] ?? 'bg-purple-50 text-purple-700'

  return (
    <Link
      to={ROUTES.MODULE(module.id)}
      className="flex items-center gap-4 bg-white rounded-xl p-4 border border-[#f0f0f5]
                 hover:border-[#8127cf]/30 hover:shadow-md transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-[#f0dbff] flex items-center justify-center
                      text-[#8127cf] flex-shrink-0 group-hover:scale-105 transition-transform">
        <span className="material-symbols-outlined text-[24px]">school</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0b1c30] truncate group-hover:text-[#8127cf] transition-colors">
          {module.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColor}`}>
            {module.level}
          </span>
          <span className="text-xs text-[#7e7385]">
            {formatDuration(module.duration_minutes)}
          </span>
          {module.is_premium && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
              Premium
            </span>
          )}
        </div>
      </div>
      <span className="material-symbols-outlined text-[#cfc2d6] group-hover:text-[#8127cf]
                       transition-colors flex-shrink-0">
        chevron_right
      </span>
    </Link>
  )
}

// ─── Résultat leçon ──────────────────────────────────────────────────────────
function LessonResult({ lesson }) {
  return (
    <Link
      to={ROUTES.LESSON(lesson.id)}
      className="flex items-center gap-4 bg-white rounded-xl p-4 border border-[#f0f0f5]
                 hover:border-[#8127cf]/30 hover:shadow-md transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-[#e5f9f6] flex items-center justify-center
                      text-[#06b6d4] flex-shrink-0 group-hover:scale-105 transition-transform">
        <span className="material-symbols-outlined text-[24px]">play_circle</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0b1c30] truncate group-hover:text-[#8127cf] transition-colors">
          {lesson.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lesson.modules?.title && (
            <span className="text-xs text-[#7e7385] truncate">
              {lesson.modules.title}
            </span>
          )}
          <span className="text-[#cfc2d6]">·</span>
          <span className="text-xs text-[#7e7385]">
            {formatDuration(lesson.duration_minutes)}
          </span>
          {lesson.is_free && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              Gratuit
            </span>
          )}
        </div>
      </div>
      <span className="material-symbols-outlined text-[#cfc2d6] group-hover:text-[#8127cf]
                       transition-colors flex-shrink-0">
        chevron_right
      </span>
    </Link>
  )
}

// ─── Section résultats ───────────────────────────────────────────────────────
function ResultSection({ title, icon, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[#8127cf] text-[20px]">{icon}</span>
        <h3 className="text-base font-bold text-[#0b1c30]">{title}</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0dbff] text-[#8127cf]">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────────────────────
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [input,    setInput]    = useState(query)
  const [modules,  setModules]  = useState([])
  const [lessons,  setLessons]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)

  const inputRef = useRef(null)

  // Focus automatique à l'arrivée sur la page
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Lancer la recherche si ?q= est présent au chargement
  useEffect(() => {
    if (!query) return
    const t = setTimeout(() => {
      setInput(query)
      doSearch(query)
    }, 0)
    return () => clearTimeout(t)
  }, [query])

  async function doSearch(term) {
    const q = term.trim()
    if (!q) return

    setLoading(true)
    setSearched(false)

    try {
      const [modsRes, lessonsRes] = await Promise.all([
        supabase
          .from('modules')
          .select('id, title, description, order_index, duration_minutes, level, is_premium')
          .ilike('title', `%${q}%`)
          .order('order_index', { ascending: true })
          .limit(10),

        supabase
          .from('lessons')
          .select('id, title, duration_minutes, is_free, module_id, modules(title)')
          .ilike('title', `%${q}%`)
          .order('order_index', { ascending: true })
          .limit(20),
      ])

      setModules(modsRes.data ?? [])
      setLessons(lessonsRes.data ?? [])
      setSearched(true)
    } catch (err) {
      console.error('[Search] error:', err)
      setModules([])
      setLessons([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    setSearchParams({ q })
    doSearch(q)
  }

  const totalResults = modules.length + lessons.length
  const hasResults   = totalResults > 0
  const isEmpty      = searched && !loading && !hasResults

  return (
    <div className="max-w-2xl mx-auto pb-12">

      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-[#0b1c30] mb-1">
          Recherche
        </h1>
        <p className="text-sm text-[#7e7385]">
          Trouvez un module ou une leçon
        </p>
      </div>

      {/* Barre de recherche principale */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-[#7e7385] text-[22px]">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex : réseaux de neurones, Python, IA..."
            className="w-full h-14 pl-12 pr-32 bg-white border border-[#cfc2d6]
                       focus:border-[#8127cf] focus:outline-none rounded-2xl text-sm
                       text-[#0b1c30] placeholder:text-[#7e7385] shadow-sm
                       transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 h-10 px-6 rounded-xl text-white text-sm font-bold
                       disabled:opacity-40 disabled:cursor-not-allowed transition-all
                       active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
          >
            Chercher
          </button>
        </div>
      </form>

      {/* Suggestions rapides (état initial) */}
      {!searched && !loading && (
        <div>
          <p className="text-xs font-bold text-[#7e7385] uppercase tracking-wider mb-3">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {['Intelligence artificielle', 'Machine Learning', 'Python', 'Algorithme', 'Réseaux de neurones', 'Deep Learning'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s)
                  setSearchParams({ q: s })
                  doSearch(s)
                }}
                className="px-4 py-2 rounded-full bg-white border border-[#cfc2d6]
                           text-sm text-[#4d4354] hover:border-[#8127cf] hover:text-[#8127cf]
                           transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <SearchSkeleton />}

      {/* Résultats */}
      {!loading && searched && hasResults && (
        <div className="space-y-8">
          <p className="text-sm text-[#7e7385]">
            <span className="font-bold text-[#0b1c30]">{totalResults} résultat{totalResults > 1 ? 's' : ''}</span>
            {' '}pour <span className="font-bold text-[#8127cf]">« {query} »</span>
          </p>

          {modules.length > 0 && (
            <ResultSection title="Modules" icon="school" count={modules.length}>
              {modules.map((m) => <ModuleResult key={m.id} module={m} />)}
            </ResultSection>
          )}

          {lessons.length > 0 && (
            <ResultSection title="Leçons" icon="play_circle" count={lessons.length}>
              {lessons.map((l) => <LessonResult key={l.id} lesson={l} />)}
            </ResultSection>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-[#f0dbff] flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-[#8127cf]">
              search_off
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#0b1c30]">
            Aucun résultat pour « {query} »
          </h3>
          <p className="text-sm text-[#7e7385] max-w-xs">
            Essayez avec des mots-clés différents ou parcourez le curriculum complet.
          </p>
          <Link
            to={ROUTES.CURRICULUM}
            className="mt-2 px-6 py-3 rounded-full text-white text-sm font-bold
                       inline-flex items-center gap-2 transition-all hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
          >
            Voir tous les modules
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      )}

    </div>
  )
}