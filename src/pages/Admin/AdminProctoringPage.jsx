// src/pages/Admin/AdminProctoringPage.jsx
// Journal des violations de proctoring détectées pendant les quiz
// (sortie d'onglet ou perte de focus de la fenêtre = quiz invalidé côté élève).

import { useState, useEffect } from 'react'
import { ShieldAlert, MonitorX, EyeOff } from 'lucide-react'
import { getProctoringViolations } from '@/services/proctoringService'

const VIOLATION_LABELS = {
  tab_hidden:   { label: 'Changement d\'onglet', icon: EyeOff,    color: 'text-orange-600 bg-orange-50 border-orange-200' },
  window_blur:  { label: 'Perte de focus fenêtre', icon: MonitorX, color: 'text-red-600 bg-red-50 border-red-200' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminProctoringPage() {
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weekCount, setWeekCount] = useState(0)

  useEffect(() => {
    getProctoringViolations()
      .then(setViolations)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Date.now() est une fonction impure : on la lit ici (dans un effet, hors
  // render) plutôt que directement dans le corps du composant — voir
  // react-hooks/purity.
  useEffect(() => {
    const now = Date.now()
    setWeekCount(violations.filter((v) => now - new Date(v.created_at) < 7 * 86400000).length)
  }, [violations])

  const stats = [
    { label: 'Violations totales', value: violations.length },
    { label: 'Étudiants concernés', value: new Set(violations.map((v) => v.profiles?.email)).size },
    { label: 'Cette semaine', value: weekCount },
  ]

  return (
    <div className="pb-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30]">Intégrité des quiz</h1>
          <p className="text-sm text-[#68627a]">
            Journal des sorties d'onglet/fenêtre détectées pendant les quiz — chaque violation invalide automatiquement la tentative de l'étudiant.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-violet-100 p-5">
            <p className="text-2xl font-bold text-[#0b1c30]">{s.value}</p>
            <p className="text-xs text-[#68627a] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-violet-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#68627a]">Chargement...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-600">{error}</div>
        ) : violations.length === 0 ? (
          <div className="p-10 text-center text-[#68627a]">
            Aucune violation enregistrée pour le moment — bon signe.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-violet-100 text-left text-xs uppercase tracking-wider text-[#a89fb5]">
                <th className="px-6 py-3 font-semibold">Étudiant</th>
                <th className="px-6 py-3 font-semibold">Quiz / Module</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => {
                const meta = VIOLATION_LABELS[v.violation_type] || VIOLATION_LABELS.tab_hidden
                const Icon = meta.icon
                return (
                  <tr key={v.id} className="border-b border-violet-50 last:border-0 hover:bg-violet-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#0b1c30]">{v.profiles?.full_name || 'Utilisateur supprimé'}</p>
                      <p className="text-xs text-[#a89fb5]">{v.profiles?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[#0b1c30]">{v.quizzes?.title || '—'}</p>
                      <p className="text-xs text-[#a89fb5]">{v.modules?.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#68627a]">{formatDate(v.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}