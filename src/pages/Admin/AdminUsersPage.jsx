// src/pages/Admin/AdminUsersPage.jsx
// But : permettre à l'admin de consulter, filtrer et gérer tous les utilisateurs.
// Données réelles depuis Supabase : profiles + user_progress + quiz_attempts.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { ROLES, ROLE_LABELS, ROLE_COLORS, getAssignableRoles } from '@/services/permissionsService'
import { useToast } from '@/components/ui/Toast'
import { inviteUser, deleteUsers } from '@/services/adminUserActionsService'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_GRADS = [
  'from-cyan-400 to-blue-500',    'from-green-400 to-teal-500',
  'from-yellow-400 to-orange-500','from-violet-400 to-purple-600',
  'from-pink-400 to-rose-500',    'from-red-400 to-orange-400',
  'from-blue-400 to-indigo-500',  'from-teal-400 to-cyan-500',
]

function getInitials(name = '', email = '') {
  const src = name.trim() || email
  const parts = src.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'À l\'instant'
  if (mins  < 60) return `Il y a ${mins}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  return `Il y a ${days}j`
}

// ─── Statut déduit depuis last_seen_at ────────────────────────────────────────
function getStatus(lastSeenAt) {
  if (!lastSeenAt) return 'En attente'
  const days = (Date.now() - new Date(lastSeenAt).getTime()) / 86400000
  if (days <= 3)  return 'Actif'
  if (days <= 14) return 'Inactif'
  return 'Inactif'
}

const statusColors = {
  'Actif':      'bg-green-100 text-green-700',
  'Inactif':    'bg-slate-100 text-slate-500',
  'En attente': 'bg-yellow-100 text-yellow-700',
}

// ─── Skeleton ligne tableau ───────────────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3.5"><div className="w-4 h-4 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-24 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-20 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-3 w-16 bg-slate-100 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-6 w-16 bg-slate-100 rounded-lg" /></td>
    </tr>
  )
}

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore()
  const { toast } = useToast()
  const [users,        setUsers]        = useState([])
  const [totalCount,   setTotalCount]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const [search,       setSearch]       = useState('')
  const [filterPlan,   setFilterPlan]   = useState('Tous')
  const [filterStatus, setFilterStatus] = useState('Tous')
  const [filterRole,   setFilterRole]   = useState('Tous')
  const [page,         setPage]         = useState(1)

  const [selected,     setSelected]     = useState([])
  const [viewUser,     setViewUser]     = useState(null)
  const [inviteOpen,   setInviteOpen]   = useState(false)
  const [inviteEmail,  setInviteEmail]  = useState('')
  const [inviting,     setInviting]     = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // id de l'user en cours d'action

  const assignableRoles = getAssignableRoles(currentUser?.role)

  // ── Charger les utilisateurs ──────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Profiles avec pagination
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, plan, role, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (filterPlan !== 'Tous') {
        query = query.eq('plan', filterPlan === 'Illimité' ? 'premium' : 'free')
      }
      if (filterRole !== 'Tous') {
        query = query.eq('role', filterRole)
      }
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data: profiles, count, error: e1 } = await query
      if (e1) throw e1
      setTotalCount(count ?? 0)

      if (!profiles || profiles.length === 0) {
        setUsers([])
        return
      }

      const ids = profiles.map(p => p.id)

      // 2. Progression : leçons complétées par user
      const { data: progressRows } = await supabase
        .from('user_progress')
        .select('user_id, completed, updated_at')
        .in('user_id', ids)

      // 3. Total leçons pour calculer le %
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id')

      const totalLessons = (allLessons || []).length || 1

      // 4. Quiz complétés par user
      const { data: quizRows } = await supabase
        .from('quiz_attempts')
        .select('user_id')
        .in('user_id', ids)

      // ── Agréger par user_id ────────────────────────────────────────────────
      const completedByUser  = {}
      const lastSeenByUser   = {}
      ;(progressRows || []).forEach(p => {
        if (p.completed) {
          completedByUser[p.user_id] = (completedByUser[p.user_id] || 0) + 1
        }
        // Garder la date la plus récente comme dernière activité
        const prev = lastSeenByUser[p.user_id]
        if (!prev || new Date(p.updated_at) > new Date(prev)) {
          lastSeenByUser[p.user_id] = p.updated_at
        }
      })

      const quizzesByUser = {}
      ;(quizRows || []).forEach(q => {
        quizzesByUser[q.user_id] = (quizzesByUser[q.user_id] || 0) + 1
      })

      // ── Enrichir chaque profil ────────────────────────────────────────────
      const enriched = profiles.map((p, idx) => {
        const lastSeen   = lastSeenByUser[p.id] || null
        const completed  = completedByUser[p.id] || 0
        const progress   = Math.round((completed / totalLessons) * 100)
        const quizzes    = quizzesByUser[p.id] || 0
        const status     = getStatus(lastSeen)
        const role       = p.role || ROLES.LEARNER
        return {
          ...p,
          initials:  getInitials(p.full_name, p.email),
          grad:      AVATAR_GRADS[idx % AVATAR_GRADS.length],
          progress,
          quizzes,
          status,
          role,
          roleLabel: ROLE_LABELS[role] || role,
          roleColor: ROLE_COLORS[role] || ROLE_COLORS[ROLES.LEARNER],
          planLabel: p.plan === 'premium' ? 'Illimité' : 'Gratuit',
          joinedFmt: formatDate(p.created_at),
          lastSeen:  timeAgo(lastSeen),
          lastSeenRaw: lastSeen,
        }
      })

      // Filtre statut côté client (pas de colonne status en DB)
      const finalUsers = filterStatus === 'Tous'
        ? enriched
        : enriched.filter(u => u.status === filterStatus)

      setUsers(finalUsers)
    } catch (err) {
      console.error('[AdminUsersPage]', err)
      setError('Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }, [page, filterPlan, filterStatus, filterRole, search])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 400 : 0) // debounce search
    return () => clearTimeout(timer)
  }, [fetchUsers])

  // ── Actions admin : changer le rôle / supprimer / inviter ─────────────────
  const handleUpdateRole = async (userId, newRole) => {
    setActionLoading(userId)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setActionLoading(null)
    if (error) {
      console.error('[AdminUsersPage] updateRole', error)
      toast.error("Échec de la mise à jour du rôle.")
      return
    }
    toast.success('Rôle mis à jour.')
    fetchUsers()
    setViewUser(null)
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return
    setActionLoading(userId)
    try {
      await deleteUsers([userId])
      toast.success('Utilisateur supprimé.')
      fetchUsers()
    } catch (err) {
      console.error('[AdminUsersPage] deleteUser', err)
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selected.length === 0) return
    if (!window.confirm(`Supprimer ${selected.length} utilisateur(s) ?`)) return
    try {
      await deleteUsers(selected)
      toast.success(`${selected.length} utilisateur(s) supprimé(s).`)
      setSelected([])
      fetchUsers()
    } catch (err) {
      console.error('[AdminUsersPage] bulkDelete', err)
      toast.error(err.message)
    }
  }

  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await inviteUser(inviteEmail.trim())
      toast.success(`Invitation envoyée à ${inviteEmail.trim()}.`)
      setInviteOpen(false)
      setInviteEmail('')
      fetchUsers()
    } catch (err) {
      console.error('[AdminUsersPage] inviteUser', err)
      toast.error(err.message)
    } finally {
      setInviting(false)
    }
  }

  // ── Sélection ─────────────────────────────────────────────────────────────
  const toggleSelect = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const allSelected  = users.length > 0 && users.every(u => selected.includes(u.id))
  const toggleAll    = () => setSelected(allSelected ? [] : users.map(u => u.id))

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="min-h-screen pb-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-violet-950">Utilisateurs</h1>
          <p className="text-slate-500 mt-1">
            {loading ? '…' : `${totalCount} membre${totalCount !== 1 ? 's' : ''} inscrits sur la plateforme`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Actualiser
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Inviter
          </button>
        </div>
      </div>

      {/* ── Erreur ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchUsers} className="ml-auto text-xs text-red-600 font-medium hover:underline">Réessayer</button>
        </div>
      )}

      {/* ── Filtres ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <select
          value={filterPlan}
          onChange={e => { setFilterPlan(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400"
        >
          <option>Tous</option>
          <option>Gratuit</option>
          <option>Illimité</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400"
        >
          <option>Tous</option>
          <option>Actif</option>
          <option>Inactif</option>
          <option>En attente</option>
        </select>
        <select
          value={filterRole}
          onChange={e => { setFilterRole(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400"
        >
          <option value="Tous">Tous les rôles</option>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {selected.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Supprimer ({selected.length})
          </button>
        )}
      </div>

      {/* ── Tableau ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Utilisateur</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Rôle</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Progression</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Inscrit le</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Dernière activité</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? [1,2,3,4,5].map(i => <TableRowSkeleton key={i} />)
                : users.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <span className="material-symbols-outlined text-slate-300 text-[48px] mb-3 block">person_search</span>
                        <p className="text-slate-400">Aucun utilisateur trouvé</p>
                      </td>
                    </tr>
                  )
                  : users.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(u.id) ? 'bg-violet-50' : ''}`}>
                      <td className="px-4 py-3.5">
                        <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-400" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${u.grad} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {u.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.full_name || '—'}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${u.roleColor}`}>
                          {u.roleLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.planLabel === 'Illimité' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.planLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${u.progress}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{u.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[u.status]}`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{u.joinedFmt}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{u.lastSeen}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewUser(u)} className="w-7 h-7 rounded-lg hover:bg-violet-100 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[16px] text-violet-600">visibility</span>
                          </button>
                          <button
                            onClick={() => setViewUser(u)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={actionLoading === u.id}
                            className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[16px] text-red-400">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>
            {loading ? '…' : `${users.length} affiché(s) sur ${totalCount}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >←</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${page === p ? 'bg-violet-700 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >→</button>
          </div>
        </div>
      </div>

      {/* ── Modal détail utilisateur ──────────────────────────────────────── */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Profil utilisateur</h3>
              <button onClick={() => setViewUser(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${viewUser.grad} flex items-center justify-center text-white text-xl font-bold`}>
                {viewUser.initials}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{viewUser.full_name || '—'}</p>
                <p className="text-sm text-slate-400">{viewUser.email}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${statusColors[viewUser.status]}`}>
                  {viewUser.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Plan',            value: viewUser.planLabel },
                { label: 'Progression',     value: `${viewUser.progress}%` },
                { label: 'Quiz complétés',  value: viewUser.quizzes },
                { label: 'Inscrit le',      value: viewUser.joinedFmt },
                { label: 'Dernière activité', value: viewUser.lastSeen },
                { label: 'Rôle',            value: viewUser.role || 'user' },
              ].map(d => (
                <div key={d.label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{d.label}</p>
                  <p className="text-sm font-bold text-slate-700">{d.value}</p>
                </div>
              ))}
            </div>

            {/* Barre de progression détaillée */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Progression du cours</span>
                <span className="font-semibold text-violet-700">{viewUser.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                  style={{ width: `${viewUser.progress}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setViewUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                Fermer
              </button>
              <select
                defaultValue={viewUser.role || ROLES.LEARNER}
                disabled={actionLoading === viewUser.id}
                onChange={e => handleUpdateRole(viewUser.id, e.target.value)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-center focus:outline-none focus:border-violet-400"
              >
                {assignableRoles.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale d'invitation ────────────────────────────────────────────── */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleInviteSubmit}
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Inviter un membre</h3>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Un email d'invitation avec un lien d'inscription sera envoyé à cette adresse.
            </p>
            <input
              type="email"
              required
              autoFocus
              placeholder="email@exemple.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-400"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="flex-1 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 transition-colors disabled:opacity-50"
              >
                {inviting ? 'Envoi…' : "Envoyer l'invitation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
