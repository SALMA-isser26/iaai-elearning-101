// src/pages/Learning/LessonPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/store/authStore'
import { getLessonById, getLessonsByModule } from '@/services/courseService'
import { markLessonComplete, getProgressByModule } from '@/services/progressService'
import { supabase } from '@/services/supabaseClient'
import { createLessonTimeTracker } from '@/services/activityService'
import { isLessonBookmarked, toggleBookmark } from '@/services/bookmarkService'
import { getNote, saveNote } from '@/services/notesService'
import VideoPlayer from '@/components/ui/VideoPlayer'
import { Bookmark, BookmarkCheck } from 'lucide-react'
// ─── Skeleton loader ─────────────────────────────────────────────────────────
function LessonSkeleton() {
  return (
    <div className="pb-12 animate-pulse">
      <div className="h-6 w-48 bg-[#e5eeff] rounded-full mb-6" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-64 bg-[#e5eeff] rounded" />
            <div className="h-8 w-96 bg-[#e5eeff] rounded" />
          </div>
          <div className="w-full aspect-video bg-[#e5eeff] rounded-2xl" />
          <div className="h-48 bg-[#e5eeff] rounded-2xl" />
        </div>
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="h-48 bg-[#e5eeff] rounded-2xl" />
          <div className="h-32 bg-[#e5eeff] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Composant Notes (markdown simplifié) ────────────────────────────────────
function LessonNotes({ notes }) {
  if (!notes) return null

  // Certaines leçons ont été enregistrées avec des séquences "\n" littérales
  // (backslash + n, deux caractères texte) au lieu de vrais retours à la ligne.
  // On les normalise avant tout traitement.
  const normalized = notes.replace(/\\n/g, '\n')

  // Convertit les **portions en gras** au milieu d'une ligne en <strong>,
  // au lieu de ne gérer que les lignes entièrement encadrées par **.
  const renderInline = (text) => {
    const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    return segments.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={i} className="font-bold text-[#0b1c30]">{seg.slice(2, -2)}</strong>
      }
      return <span key={i}>{seg}</span>
    })
  }

  // Rendu basique du markdown (gras, code, listes)
  const renderLine = (line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-lg font-bold text-[#0b1c30] mt-4 mb-2">{renderInline(line.slice(3))}</h3>
    }
    if (line.startsWith('### ')) {
      return <h4 key={i} className="text-base font-bold text-[#0b1c30] mt-3 mb-1">{renderInline(line.slice(4))}</h4>
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 text-sm text-[#4d4354] leading-relaxed list-disc">
          {renderInline(line.slice(2))}
        </li>
      )
    }
    if (line.startsWith('```')) {
      return null // géré dans le bloc
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }
    return <p key={i} className="text-sm text-[#4d4354] leading-relaxed">{renderInline(line)}</p>
  }

  // Séparer les blocs de code
  const parts = normalized.split('```')
  return (
    <div className="space-y-1">
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          // Bloc de code
          const lines = part.split('\n')
          const lang = lines[0] || 'python'
          const code = lines.slice(1).join('\n')
          return (
            <div key={idx} className="bg-[#1e1e2e] rounded-xl overflow-hidden my-3">
              <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-white/40 font-mono text-xs uppercase tracking-widest">{lang}</span>
              </div>
              <pre className="p-4 font-mono text-sm text-[#f8f8f2] leading-relaxed overflow-x-auto">
                {code}
              </pre>
            </div>
          )
        }
        return (
          <div key={idx}>
            {part.split('\n').map((line, i) => renderLine(line, i))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function LessonPage() {
  const { id } = useParams()
  const { user } = useAuthStore()

  const [lesson, setLesson]           = useState(null)
  const [siblings, setSiblings]       = useState([])   // toutes les leçons du module
  const [progress, setProgress]       = useState(null) // progression du module
  const [quizId, setQuizId]           = useState(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [completing, setCompleting]   = useState(false)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [timeTracker, setTimeTracker] = useState(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  // ── Notes personnelles (table lesson_notes) ─────────────────────────────────
  const [myNote, setMyNote]           = useState('')
  const [noteStatus, setNoteStatus]   = useState('idle') // idle | saving | saved | error
  const noteDebounceRef               = useRef(null)

  // ── Charger la leçon ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const lessonData = await getLessonById(id)
        setLesson(lessonData)

        // Charger les leçons du même module (pour le plan + navigation)
        const siblingsData = await getLessonsByModule(lessonData.module_id)
        setSiblings(siblingsData)

        // Charger la progression si connecté
        if (user?.id) {
          const prog = await getProgressByModule(user.id, lessonData.module_id)
          setProgress(prog)

          // Vérifier si cette leçon est déjà complétée
          const { data: existing } = await supabase
            .from('user_progress')
            .select('completed')
            .eq('user_id', user.id)
            .eq('lesson_id', id)
            .single()
          setIsCompleted(existing?.completed || false)

          // Vérifier si cette leçon est en favoris
          const { isBookmarked: bookmarked } = await isLessonBookmarked(user.id, id)
          setIsBookmarked(bookmarked)

          // Charger la note personnelle existante pour cette leçon
          const { note } = await getNote(user.id, id)
          setMyNote(note?.content || '')
          setNoteStatus('idle')

          // Démarrer le tracking du temps passé sur la leçon
          const tracker = createLessonTimeTracker(user.id, id, lessonData.module_id)
          setTimeTracker(tracker)
          tracker.startTracking()
        }
      } catch (err) {
        console.error('Erreur chargement leçon:', err)
        setError('Impossible de charger cette leçon.')
      } finally {
        setLoading(false)
      }
    }

    load()

    // Récupérer le quiz du module pour le bouton "Faire le quiz"
    async function loadQuiz() {
      try {
        const lesson = await getLessonById(id)
        if (!lesson?.module_id) return
        const { data } = await supabase
          .from('quizzes')
          .select('id')
          .eq('module_id', lesson.module_id)
          .single()
        if (data?.id) setQuizId(data.id)
      } catch { /* quiz optionnel */ }
    }
    loadQuiz()
  }, [id, user?.id])

  // Arrêter le tracking quand on quitte la page
  useEffect(() => {
    return () => {
      if (timeTracker) {
        timeTracker.stopTracking()
      }
    }
  }, [timeTracker])

  // ── Marquer comme complétée ──────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!user?.id || !lesson || isCompleted || completing) return
    setCompleting(true)
    try {
      await markLessonComplete(user.id, lesson.id, lesson.module_id)

      // Logger l'activité
      await supabase.from('user_activity').insert({
        user_id: user.id,
        type: 'lesson',
        title: `Leçon vue — ${lesson.title}`,
        detail: lesson.modules?.title || '',
      })

      setIsCompleted(true)

      // Rafraîchir la progression
      const prog = await getProgressByModule(user.id, lesson.module_id)
      setProgress(prog)
    } catch (err) {
      console.error('Erreur marquage leçon:', err)
    } finally {
      setCompleting(false)
    }
  }

  // ── Basculer le favori ───────────────────────────────────────────────────────
  const handleToggleBookmark = async () => {
    if (!user?.id || !lesson || bookmarkLoading) return
    setBookmarkLoading(true)
    try {
      await toggleBookmark(user.id, lesson.id)
      setIsBookmarked(!isBookmarked)
    } catch (err) {
      console.error('Erreur basculement favori:', err)
    } finally {
      setBookmarkLoading(false)
    }
  }

  // ── Note personnelle : sauvegarde différée (1.2s après la dernière frappe) ──
  const pendingNoteRef = useRef(null) // { userId, lessonId, value } — dernière frappe non encore confirmée en base

  const handleNoteChange = (value) => {
    setMyNote(value)
    setNoteStatus('idle')
    pendingNoteRef.current = { userId: user?.id, lessonId: id, value }
    clearTimeout(noteDebounceRef.current)
    noteDebounceRef.current = setTimeout(async () => {
      if (!user?.id || !id) return
      setNoteStatus('saving')
      const { error } = await saveNote(user.id, id, value)
      pendingNoteRef.current = null
      setNoteStatus(error ? 'error' : 'saved')
    }, 1200)
  }

  // Forcer l'enregistrement en quittant la page si une frappe n'a pas encore
  // été confirmée en base (évite de perdre les 1.2 dernières secondes de saisie).
  useEffect(() => {
    return () => {
      clearTimeout(noteDebounceRef.current)
      const pending = pendingNoteRef.current
      if (pending?.userId && pending?.lessonId) {
        saveNote(pending.userId, pending.lessonId, pending.value)
      }
    }
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────────
  const currentIndex = siblings.findIndex(l => l.id === id)
  const prevLesson   = currentIndex > 0 ? siblings[currentIndex - 1] : null
  const nextLesson   = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null

  // ── Statut de chaque leçon dans le plan ─────────────────────────────────────
  const getLessonStatus = (sibling) => {
    if (sibling.id === id) return 'active'
    const sibIndex = siblings.findIndex(l => l.id === sibling.id)
    if (sibIndex < currentIndex) return 'done'
    return 'locked'
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading) return <LessonSkeleton />

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <span className="material-symbols-outlined text-[60px] text-[#cfc2d6]">error</span>
      <p className="text-[#7e7385]">{error}</p>
      <Link to={ROUTES.CURRICULUM} className="text-[#8127cf] font-bold hover:underline">
        Retour au curriculum
      </Link>
    </div>
  )

  if (!lesson) return null

  const moduleTitle   = lesson.modules?.title || 'Module'
  const lessonNumber  = currentIndex + 1
  const totalLessons  = siblings.length

  return (
    <div className="pb-12">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to={ROUTES.MODULE(lesson.module_id)}
          className="inline-flex items-center gap-2 text-[#8127cf] text-sm font-medium hover:gap-3 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Retour au module
        </Link>
        <span className="text-sm text-[#7e7385]">
          Leçon {lessonNumber} / {totalLessons}
        </span>
      </div>

      {/* ── Layout 2 colonnes ──────────────────────────────────────────────── */}
      <div className="flex gap-6">

        {/* ── Colonne gauche (75%) ─────────────────────────────────────────── */}
        <div className="flex-1 space-y-6">

          {/* Titre */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#7e7385] mb-1">{moduleTitle}</p>
              <h2 className="text-2xl font-bold font-display text-[#0b1c30]">
                Leçon {lessonNumber} — {lesson.title}
              </h2>
            </div>
            
            {/* Bouton favori */}
            {user?.id && (
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors disabled:opacity-50"
                title={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-5 h-5 text-violet-600 fill-violet-600" />
                ) : (
                  <Bookmark className="w-5 h-5 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {isBookmarked ? 'Retirer' : 'Favori'}
                </span>
              </button>
            )}
          </div>

          {/* Lecteur vidéo */}
          <VideoPlayer
           src={lesson.video_url}
           title={lesson.title}
           onComplete={handleComplete}
           />

          {/* Bouton Marquer comme complétée */}
          <div className="flex items-center gap-4">
            {isCompleted ? (
              <div className="flex items-center gap-2 px-6 py-3 rounded-xl
                              bg-green-50 border border-green-200 text-green-700 font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Leçon complétée !
              </div>
            ) : (
              <button
                onClick={handleComplete}
                disabled={completing || !user?.id}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-white
                           font-bold text-sm transition-all hover:scale-105 active:scale-95
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {completing ? 'hourglass_empty' : 'check_circle'}
                </span>
                {completing ? 'Enregistrement...' : 'Marquer comme complétée'}
              </button>
            )}

            {nextLesson && isCompleted && (
              <Link
                to={ROUTES.LESSON(nextLesson.id)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl
                           border border-[#8127cf] text-[#8127cf] font-bold text-sm
                           hover:bg-purple-50 transition-colors"
              >
                Leçon suivante
                <span className="material-symbols-outlined text-[20px]">east</span>
              </Link>
            )}
          </div>

          {/* Notes de la leçon */}
          {lesson.content_notes && (
            <div className="bg-white rounded-2xl border-l-4 border-[#8127cf] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[#8127cf] text-[24px]">description</span>
                <h3 className="text-xl font-bold font-display text-[#0b1c30]">Notes de la leçon</h3>
              </div>
              <LessonNotes notes={lesson.content_notes} />
            </div>
          )}

          {/* Notes personnelles de l'apprenant */}
          {user?.id && (
            <div className="bg-white rounded-2xl border border-[#8127cf]/10 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8127cf] text-[22px]">edit_note</span>
                  <h3 className="text-base font-bold font-display text-[#0b1c30]">Mes notes</h3>
                </div>
                <span className="text-xs text-[#7e7385]">
                  {noteStatus === 'saving' && 'Enregistrement…'}
                  {noteStatus === 'saved'  && '✓ Enregistré'}
                  {noteStatus === 'error'  && 'Erreur d\'enregistrement'}
                </span>
              </div>
              <textarea
                value={myNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Prenez vos notes personnelles pendant la leçon — elles sont privées et sauvegardées automatiquement."
                rows={5}
                className="w-full resize-y rounded-xl border border-[#e5e0f0] p-4 text-sm text-[#4d4354]
                           leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#8127cf]/30 focus:border-[#8127cf]/40
                           placeholder:text-[#a89fb0]"
              />
            </div>
          )}

          {/* Navigation leçons */}
          <div className="flex items-center justify-between py-4">
            {prevLesson ? (
              <Link
                to={ROUTES.LESSON(prevLesson.id)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl
                           border border-[#8127cf] text-[#8127cf] font-bold text-sm
                           hover:bg-[#8127cf]/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">west</span>
                Leçon précédente
              </Link>
            ) : (
              <div />
            )}

            {/* Points de progression */}
            <div className="flex gap-2">
              {siblings.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
                    i < currentIndex
                      ? 'w-2.5 h-2.5 bg-green-400'
                      : i === currentIndex
                        ? 'w-3 h-3 bg-[#8127cf]'
                        : 'w-2.5 h-2.5 bg-[#cfc2d6]/30'
                  }`}
                />
              ))}
            </div>

            {nextLesson ? (
              <Link
                to={ROUTES.LESSON(nextLesson.id)}
                className="flex items-center gap-2 px-8 py-3 rounded-xl
                           text-white font-bold text-sm transition-all
                           hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
              >
                Leçon suivante
                <span className="material-symbols-outlined text-[20px]">east</span>
              </Link>
            ) : (
              quizId ? (
                <Link
                  to={ROUTES.QUIZ(lesson.module_id)}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl
                             text-white font-bold text-sm transition-all
                             hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                >
                  <span className="material-symbols-outlined text-[20px]">quiz</span>
                  Faire le quiz du module
                </Link>
              ) : (
                <Link
                  to={ROUTES.MODULE(lesson.module_id)}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl
                             text-white font-bold text-sm transition-all
                             hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                >
                  Terminer le module
                  <span className="material-symbols-outlined text-[20px]">emoji_events</span>
                </Link>
              )
            )}
          </div>

        </div>

        {/* ── Colonne droite (25%) ─────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Plan du cours */}
          <div className="bg-white rounded-2xl p-5 border border-[#8127cf]/10 shadow-sm">
            <h3 className="text-base font-bold font-display text-[#0b1c30] mb-4">Plan du cours</h3>
            <div className="space-y-1">
              {siblings.map((sibling) => {
                const status = getLessonStatus(sibling)
                return (
                  <Link
                    key={sibling.id}
                    to={ROUTES.LESSON(sibling.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors
                                ${status === 'active' ? 'bg-[#f0dbff]' : 'hover:bg-[#f8f5ff]'}
                                ${status === 'locked' ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <span className={`material-symbols-outlined text-[18px]
                                     ${status === 'done'   ? 'text-green-500' :
                                       status === 'active' ? 'text-[#8127cf]' :
                                       'text-[#7e7385]'}`}>
                      {status === 'done' ? 'check_circle' : status === 'active' ? 'play_circle' : 'lock'}
                    </span>
                    <span className={`text-sm ${status === 'active' ? 'text-[#8127cf] font-bold' : 'text-[#4d4354]'}`}>
                      {sibling.title}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Progression */}
          {progress && (
            <div className="bg-white rounded-2xl p-5 border border-[#8127cf]/10 shadow-sm">
              <h3 className="text-base font-bold font-display text-[#0b1c30] mb-4">Progression</h3>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#7e7385]">Ce module</span>
                <span className="text-xs font-bold text-[#8127cf]">{progress.percent}%</span>
              </div>
              <div className="h-2 w-full bg-[#e5eeff] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress.percent}%`,
                    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-[#7e7385] text-xs">
                <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                {progress.completedLessons}/{progress.totalLessons} leçons terminées
              </div>
            </div>
          )}

          {/* Durée */}
          <div className="bg-white rounded-2xl p-5 border border-[#8127cf]/10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-500">timer</span>
              </div>
              <div>
                <p className="text-xs text-[#7e7385]">Durée estimée</p>
                <p className="text-base font-bold text-[#0b1c30]">{lesson.duration_minutes} min</p>
              </div>
            </div>
          </div>

          {/* Astuce */}
          {lesson.tip && (
            <div className="bg-[#fef9c3] rounded-2xl p-5 border border-yellow-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-[#854d0e]">
                <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                <h3 className="text-base font-bold">Astuce</h3>
              </div>
              <p className="text-[#854d0e] text-xs leading-relaxed">{lesson.tip}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}