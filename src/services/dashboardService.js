// src/services/dashboardService.js
import { supabase } from '@/services/supabaseClient'
import i18n from '@/i18n'

// ─── Helpers de formatage ─────────────────────────────────────────────────────

function formatRelativeTime(isoString) {
  if (!isoString) return 'Récemment'
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours   = Math.floor(diff / 3600000)
  const days    = Math.floor(diff / 86400000)
  if (minutes < 60)  return `Il y a ${minutes} min`
  if (hours   < 24)  return `Il y a ${hours}h`
  if (days    === 1) return 'Hier'
  return `Il y a ${days} jours`
}

function formatStudyTime(minutes) {
  if (!minutes || minutes === 0) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── Normalisation activité → format attendu par DashboardPage ───────────────

const ACTIVITY_CONFIG = {
  quiz:        { icon: 'check_circle',  bg: 'bg-green-50',  text: 'text-green-600' },
  lesson:      { icon: 'play_circle',   bg: 'bg-blue-50',   text: 'text-blue-600' },
  module:      { icon: 'emoji_events',  bg: 'bg-purple-50', text: 'text-purple-600' },
  certificate: { icon: 'workspace_premium', bg: 'bg-yellow-50', text: 'text-yellow-600' },
}

function normalizeActivity(items) {
  if (!items?.length) return []
  return items.map((item) => {
    const cfg = ACTIVITY_CONFIG[item.type] ?? ACTIVITY_CONFIG.lesson
    return {
      icon: cfg.icon,
      bg: cfg.bg,
      text: cfg.text,
      title: item.title || i18n.t('dashboard.default_activity_title'),
      time: formatRelativeTime(item.created_at),
      extra: item.detail || '',
      extraClass: item.type === 'quiz' ? 'text-green-600 font-bold' : 'text-[#7e7385]',
    }
  })
}

// ─── Calcul stats depuis les vraies tables ────────────────────────────────────

function buildStats({ completedLessons, passedQuizzes, studyMinutes, certificates }) {
  return [
    {
      icon: 'timer',
      border: 'border-cyan-400',
      bg: 'bg-cyan-50',
      text: 'text-cyan-500',
      label: i18n.t('dashboard.stats.study_time'),
      value: formatStudyTime(studyMinutes),
    },
    {
      icon: 'menu_book',
      border: 'border-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      label: i18n.t('dashboard.stats.lessons'),
      value: `${completedLessons} leçon${completedLessons !== 1 ? 's' : ''}`,
    },
    {
      icon: 'task_alt',
      border: 'border-pink-600',
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      label: i18n.t('dashboard.stats.quizzes'),
      value: `${passedQuizzes} quiz`,
    },
    {
      icon: 'workspace_premium',
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-500',
      label: i18n.t('dashboard.stats.certificates'),
      value: `${certificates} cert.`,
    },
  ]
}

// ─── Construction de la roadmap depuis les modules réels ─────────────────────

function buildRoadmap(modules, progressByModule) {
  if (!modules?.length) return []

  return modules.map((mod) => {
    const prog = progressByModule[mod.id] ?? { completedLessons: 0, totalLessons: mod.lessons_count ?? 0 }
    const total     = prog.totalLessons
    const completed = prog.completedLessons
    const percent   = total > 0 ? Math.round((completed / total) * 100) : 0

    let status = 'locked'
    if (percent === 100) status = 'done'
    else if (completed > 0) status = 'active'
    // Déverrouiller le premier module même sans progression
    else if (mod.order_index === 1) status = 'active'

    return {
      id: mod.id,
      title: mod.title,
      status,
      progress: percent,
      completedLessons: completed,
      totalLessons: total,
    }
  })
}

// ─── Recommandations depuis cours_recommendations ou générées dynamiquement ───

function normalizeRecommendations(items, roadmap) {
  // Priorité 1 : recommandations personnalisées en base
  if (items?.length) {
    return items.map((item) => ({
      icon: 'video_library',
      bg: 'bg-[#f0dbff]',
      text: 'text-[#8127cf]',
      title: item.title,
      sub: item.subtitle || '',
      btn: item.action_label || i18n.t('dashboard.recommendation_view'),
      route: item.route || '/curriculum',
    }))
  }

  // Priorité 2 : générer depuis la roadmap (module en cours)
  const active = roadmap.find((m) => m.status === 'active')
  if (active) {
    return [
      {
        icon: 'video_library',
        bg: 'bg-[#f0dbff]',
        text: 'text-[#8127cf]',
        title: i18n.t('dashboard.recommendation_continue_prefix', { title: active.title }),
        sub: `${active.completedLessons}/${active.totalLessons} leçons · ${active.progress}%`,
        btn: i18n.t('dashboard.recommendation_continue'),
        route: `/module/${active.id}`,
      },
    ]
  }

  return []
}

// ─── Récupérer le module en cours (pour la carte "Continuer la leçon") ────────

function findCurrentModule(roadmap, modules) {
  const activeEntry = roadmap.find((m) => m.status === 'active')
  if (!activeEntry) return null
  return modules.find((m) => m.id === activeEntry.id) ?? null
}

// ─── SERVICE PRINCIPAL ────────────────────────────────────────────────────────

export async function fetchDashboardData(userId) {
  if (!userId) return buildEmptyDashboard()

  try {
    // Toutes les requêtes en parallèle pour minimiser la latence
    const [
      lessonsCompletedRes,
      quizzesPassedRes,
      certificatesRes,
      activityRes,
      recommendationsRes,
      modulesRes,
      progressRes,
    ] = await Promise.all([
      // Nb leçons complétées
      supabase
        .from('user_progress')
        .select('id, module_id, lesson_id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('completed', true),

      // Nb quiz réussis
      supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('passed', true),

      // Nb certificats
      supabase
        .from('certificates')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),

      // Activité récente (6 derniers événements)
      supabase
        .from('user_activity')
        .select('type, title, detail, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),

      // Recommandations personnalisées
      supabase
        .from('course_recommendations')
        .select('title, subtitle, action_label, route')
        .eq('user_id', userId)
        .limit(2),

      // Tous les modules (pour la roadmap)
      supabase
        .from('modules')
        .select('id, title, order_index, duration_minutes, is_premium')
        .order('order_index', { ascending: true }),

      // Progression par module
      supabase
        .from('user_progress')
        .select('lesson_id, module_id, completed')
        .eq('user_id', userId),
    ])

    // Avertir en console si une requête échoue (ne pas planter le dashboard)
    const errors = [
      lessonsCompletedRes, quizzesPassedRes, certificatesRes,
      activityRes, recommendationsRes, modulesRes, progressRes,
    ].filter((r) => r.error)
    if (errors.length) {
      errors.forEach((r) => console.warn('[Dashboard] Supabase query warn:', r.error?.message))
    }

    // ── Calcul du temps d'étude estimé ──────────────────────────────────────
    // Estimation : chaque leçon complétée ≈ 10 min (en l'absence d'un timer réel)
    const completedLessons = lessonsCompletedRes.count ?? 0
    const studyMinutes = completedLessons * 10

    // ── Stats ───────────────────────────────────────────────────────────────
    const stats = buildStats({
      completedLessons,
      passedQuizzes: quizzesPassedRes.count ?? 0,
      studyMinutes,
      certificates: certificatesRes.count ?? 0,
    })

    // ── Progression par module (map moduleId → { completedLessons }) ────────
    const progressRows = progressRes.data ?? []
    const progressByModule = {}
    for (const row of progressRows) {
      if (!progressByModule[row.module_id]) {
        progressByModule[row.module_id] = { completedLessons: 0, totalLessons: 0 }
      }
      if (row.completed) {
        progressByModule[row.module_id].completedLessons++
      }
    }

    // Récupérer le nb total de leçons par module
    const modules = modulesRes.data ?? []
    if (modules.length > 0) {
      const { data: lessonCounts } = await supabase
        .from('lessons')
        .select('module_id')
        .in('module_id', modules.map((m) => m.id))

      if (lessonCounts) {
        for (const l of lessonCounts) {
          if (!progressByModule[l.module_id]) {
            progressByModule[l.module_id] = { completedLessons: 0, totalLessons: 0 }
          }
          progressByModule[l.module_id].totalLessons++
        }
      }
    }

    // ── Roadmap ─────────────────────────────────────────────────────────────
    const roadmap = buildRoadmap(modules, progressByModule)

    // ── Module en cours ─────────────────────────────────────────────────────
    const currentModule = findCurrentModule(roadmap, modules)

    // ── Progression globale ─────────────────────────────────────────────────
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })

    const overallTotal     = totalLessons ?? 0
    const overallCompleted = completedLessons
    const overallPercent   = overallTotal > 0
      ? Math.round((overallCompleted / overallTotal) * 100)
      : 0

    // ── Activité ────────────────────────────────────────────────────────────
    const recentActivity = normalizeActivity(activityRes.data)

    // ── Recommandations ─────────────────────────────────────────────────────
    const activeRoadmapItem = roadmap.find((m) => m.status === 'active')
    const recommendations = normalizeRecommendations(
      recommendationsRes.data,
      roadmap.map((r) => ({
        ...r,
        completedLessons: progressByModule[r.id]?.completedLessons ?? 0,
        totalLessons: progressByModule[r.id]?.totalLessons ?? 0,
      }))
    )

    return {
      stats,
      roadmap,
      recentActivity,
      recommendations,
      // Données supplémentaires pour les widgets du Dashboard
      meta: {
        overallPercent,
        overallCompleted,
        overallTotal,
        currentModule,
        activeModuleProgress: activeRoadmapItem?.progress ?? 0,
      },
    }
  } catch (error) {
    console.error('[Dashboard] Erreur critique:', error)
    return buildEmptyDashboard()
  }
}

// ─── État vide (0 données, pas de fallback mocké) ─────────────────────────────

function buildEmptyDashboard() {
  return {
    stats: buildStats({ completedLessons: 0, passedQuizzes: 0, studyMinutes: 0, certificates: 0 }),
    roadmap: [],
    recentActivity: [],
    recommendations: [],
    meta: {
      overallPercent: 0,
      overallCompleted: 0,
      overallTotal: 0,
      currentModule: null,
      activeModuleProgress: 0,
    },
  }
}