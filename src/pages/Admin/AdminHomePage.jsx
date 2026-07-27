// src/pages/Admin/AdminHomePage.jsx
// But : tableau de bord de pilotage — première page vue par l'admin.
// Remplace les données mockées (kpis, recentUsers) par de vraies requêtes Supabase.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { ROUTES } from '@/constants/routes'
import { useToast } from '@/components/ui/Toast'
import { Users, GraduationCap, CircleCheckBig, Crown, ArrowUpRight } from 'lucide-react'

// ─── Liens rapides (statiques — pas besoin de Supabase) ───────────────────────
const quickLinks = [
  { label: 'Gérer les utilisateurs', to: ROUTES.ADMIN_USERS,   icon: 'manage_accounts', color: 'text-violet-600', bg: 'bg-violet-50' },
  { label: 'Gérer les cours',        to: ROUTES.ADMIN_COURSES, icon: 'menu_book',        color: 'text-cyan-600',   bg: 'bg-cyan-50'   },
  { label: 'Voir les analytics',     to: ROUTES.ADMIN_ANALYTICS, icon: 'bar_chart',        color: 'text-pink-600',   bg: 'bg-pink-50'   },
  { label: 'Paramètres système',     to: ROUTES.ADMIN_SETTINGS,       icon: 'settings',         color: 'text-slate-600',  bg: 'bg-slate-50'  },
]

// ─── Fonction pour générer des alertes dynamiques basées sur l'état réel ──────────
function generateDynamicAlerts(kpis, recentUsers) {
  const alerts = []
  
  // Alertes basées sur les KPIs
  if (kpis) {
    const totalUsers = kpis.find(k => k.label === 'Utilisateurs inscrits')?.value || 0
    const totalModules = kpis.find(k => k.label === 'Modules publiés')?.value || 0
    
    // Alerte si peu d'utilisateurs
    if (totalUsers < 10) {
      alerts.push({
        icon: 'warning',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        message: `${totalUsers} utilisateur(s) inscrit(s) - considérez des actions marketing`
      })
    }
    
    // Alerte si peu de modules publiés
    if (totalModules < 3) {
      alerts.push({
        icon: 'warning',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        message: `${totalModules} module(s) publié(s) - enrichissez le contenu pédagogique`
      })
    }
    
    // Alerte positive si bonne activité
    if (totalUsers >= 50) {
      alerts.push({
        icon: 'trending_up',
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        message: `Bonne activité : ${totalUsers} utilisateurs inscrits`
      })
    }
  }
  
  // Alertes basées sur les utilisateurs récents
  if (recentUsers && recentUsers.length > 0) {
    const today = new Date().toDateString()
    const newUsersToday = recentUsers.filter(u => new Date(u.created_at).toDateString() === today).length
    
    if (newUsersToday > 0) {
      alerts.push({
        icon: 'person_add',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        message: `${newUsersToday} nouvel(s) utilisateur(s) aujourd'hui`
      })
    }
  }
  
  // Alerte par défaut si aucune alerte
  if (alerts.length === 0) {
    alerts.push({
      icon: 'check_circle',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      message: 'Système opérationnel - tout va bien'
    })
  }
  
  return alerts
}

// ─── Gradients avatar par initiales ──────────────────────────────────────────
const AVATAR_GRADS = [
  'from-cyan-400 to-blue-500',
  'from-green-400 to-teal-500',
  'from-yellow-400 to-orange-500',
  'from-violet-400 to-purple-600',
  'from-pink-400 to-rose-500',
]

function getInitials(fullName = '') {
  const parts = fullName.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return fullName.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60)  return `Il y a ${mins}min`
  if (hours < 24)  return `Il y a ${hours}h`
  if (days  === 1) return 'Hier'
  return `Il y a ${days}j`
}

// ─── Skeleton KPI ─────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-32 bg-slate-100 rounded" />
    </div>
  )
}

// ─── Skeleton ligne utilisateur ───────────────────────────────────────────────
function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-36 bg-slate-200 rounded" />
        <div className="h-3 w-24 bg-slate-100 rounded" />
      </div>
      <div className="h-5 w-16 bg-slate-100 rounded-full" />
    </div>
  )
}

export default function AdminHomePage() {
  const { toast } = useToast()
  const [kpis,        setKpis]        = useState(null)   // null = chargement
  const [recentUsers, setRecentUsers] = useState(null)   // null = chargement
  const [error,       setError]       = useState(null)
  const [refreshing,  setRefreshing]  = useState(false)

  useEffect(() => {
    fetchDashboardData({ silent: true })
  }, [])

  async function fetchDashboardData({ silent = false } = {}) {
    setError(null)
    setRefreshing(true)
    try {
      // ── 4 requêtes en parallèle — count uniquement, très rapide ─────────────
      const [
        { count: totalUsers,   error: e1 },
        { count: totalModules, error: e2 },
        { count: totalQuizzes, error: e3 },
        { count: totalPremium, error: e4 },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('modules').select('*',  { count: 'exact', head: true }),
        supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'premium'),
      ])

      if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4

      setKpis([
        { icon: Users,           label: 'Utilisateurs inscrits', value: totalUsers   ?? 0, gradient: 'from-violet-500 to-purple-600' },
        { icon: GraduationCap,   label: 'Modules publiés',       value: totalModules ?? 0, gradient: 'from-cyan-500 to-blue-600'     },
        { icon: CircleCheckBig,  label: 'Quiz complétés',        value: totalQuizzes ?? 0, gradient: 'from-pink-500 to-rose-600'     },
        { icon: Crown,           label: 'Abonnés Illimité',      value: totalPremium ?? 0, gradient: 'from-amber-400 to-orange-500'  },
      ])

      // ── 5 derniers inscrits avec leur progression ────────────────────────────
      const { data: users, error: e5 } = await supabase
        .from('profiles')
        .select('id, full_name, email, plan, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (e5) throw e5

      // Progression : nombre de leçons complétées par rapport au total
      const { data: progressRows } = await supabase
        .from('user_progress')
        .select('user_id, completed')
        .in('user_id', (users || []).map(u => u.id))

      // ─── Correction platform-2 : count côté serveur (HEAD request) ──────────
      // Avant : .select('id', { head: false }) chargeait toutes les lignes en mémoire
      // Après : .select('*', { count: 'exact', head: true }) → COUNT(*) SQL, 0 ligne transférée
      const { count: totalLessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })

      const totalLessons = totalLessonsCount || 1

      // Calculer % progression par user
      const completedByUser = {}
      ;(progressRows || []).forEach(p => {
        if (p.completed) {
          completedByUser[p.user_id] = (completedByUser[p.user_id] || 0) + 1
        }
      })

      const enriched = (users || []).map((u, idx) => ({
        ...u,
        initials: getInitials(u.full_name || u.email),
        grad:     AVATAR_GRADS[idx % AVATAR_GRADS.length],
        progress: Math.round(((completedByUser[u.id] || 0) / totalLessons) * 100),
        joined:   timeAgo(u.created_at),
        planLabel: u.plan === 'premium' ? 'Illimité' : 'Gratuit',
      }))

      setRecentUsers(enriched)
      if (!silent) toast.success('Tableau de bord actualisé.')

    } catch (err) {
      console.error('[AdminHomePage]', err)
      setError('Impossible de charger les données du tableau de bord.')
      if (!silent) toast.error('Impossible de charger les données du tableau de bord.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen pb-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-violet-950">Tableau de bord Admin</h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble de la plateforme IAAI eLearning 101</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Erreur ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchDashboardData} className="ml-auto text-xs text-red-600 font-medium hover:underline">
            Réessayer
          </button>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpis === null
          ? [1,2,3,4].map(i => <KpiSkeleton key={i} />)
          : kpis.map(k => (
              <div
                key={k.label}
                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm
                           hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${k.gradient}
                                    flex items-center justify-center shadow-md
                                    group-hover:scale-105 transition-transform duration-200`}>
                    <k.icon className="w-6 h-6 text-white" strokeWidth={2.2} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100
                                            transition-opacity duration-200" />
                </div>
                <p className="text-3xl font-bold font-display text-slate-800 mb-1 tracking-tight">
                  {k.value.toLocaleString('fr-FR')}
                </p>
                <p className="text-sm text-slate-500">{k.label}</p>
              </div>
            ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Derniers inscrits */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Derniers inscrits</h2>
              <Link to={ROUTES.ADMIN_USERS} className="text-xs text-violet-600 font-medium hover:underline flex items-center gap-1">
                Voir tout
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentUsers === null
                ? [1,2,3,4,5].map(i => <UserRowSkeleton key={i} />)
                : recentUsers.length === 0
                  ? (
                    <div className="px-6 py-10 text-center text-slate-400 text-sm">
                      Aucun utilisateur inscrit pour le moment
                    </div>
                  )
                  : recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${u.grad} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {u.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || '—'}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          u.planLabel === 'Illimité' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.planLabel}
                        </span>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{u.progress}%</p>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${u.progress}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 w-20 text-right">{u.joined}</span>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Alertes système */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Alertes système</h2>
            <div className="space-y-3">
              {generateDynamicAlerts(kpis, recentUsers).map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${a.border} ${a.bg}`}>
                  <span className={`material-symbols-outlined text-[20px] shrink-0 ${a.color}`}>{a.icon}</span>
                  <p className="text-sm text-slate-700">{a.message}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Accès rapides */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Accès rapides</h2>
            <div className="space-y-2">
              {quickLinks.map(l => (
                <Link key={l.label} to={l.to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className={`w-9 h-9 rounded-lg ${l.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[20px] ${l.color}`}>{l.icon}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-violet-700">{l.label}</span>
                  <span className="material-symbols-outlined text-slate-300 text-[16px] ml-auto group-hover:text-violet-400">arrow_forward</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Statut Supabase */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Statut Supabase</h2>
            <div className="space-y-3">
              {[
                { label: 'Base de données',  status: 'Opérationnelle', ok: true  },
                { label: 'Authentification', status: 'Opérationnelle', ok: true  },
                { label: 'Storage',          status: 'Non configuré',  ok: false },
                { label: 'Edge Functions',   status: 'Opérationnelle', ok: true  },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{s.label}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${s.ok ? 'text-green-600' : 'text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${s.ok ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
