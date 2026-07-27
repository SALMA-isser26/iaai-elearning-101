// src/pages/Admin/AdminAnalyticsPage.jsx
// Page admin pour les statistiques détaillées de la plateforme

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { TrendingUp, Users, BookOpen, Clock, Download } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  // Déclenche l'export automatiquement si on arrive via le bouton
  // "Download Reports" de la sidebar (lien '/admin/analytics?export=1'),
  // une fois les données chargées. Le paramètre est ensuite retiré de
  // l'URL pour ne pas re-déclencher l'export à chaque rafraîchissement.
  useEffect(() => {
    if (searchParams.get('export') === '1' && stats && chartData) {
      handleExport()
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, chartData, searchParams])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)
    try {
      // Calculer les dates selon la période
      const now = new Date()
      let startDate = new Date()
      
      if (timeRange === '7d') {
        startDate.setDate(now.getDate() - 7)
      } else if (timeRange === '30d') {
        startDate.setDate(now.getDate() - 30)
      } else if (timeRange === '90d') {
        startDate.setDate(now.getDate() - 90)
      } else if (timeRange === '1y') {
        startDate.setFullYear(now.getFullYear() - 1)
      }

      // Récupérer les données principales
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalModules },
        { count: totalLessons },
        { count: totalQuizzes },
        { count: completedQuizzes },
        { count: premiumUsers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('updated_at', startDate.toISOString()),
        supabase.from('modules').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('quizzes').select('*', { count: 'exact', head: true }),
        supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'premium'),
      ])

      // Progression des utilisateurs
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('completed, updated_at')
        .gte('updated_at', startDate.toISOString())

      const completedLessons = progressData?.filter(p => p.completed).length || 0

      // Données temporelles pour les graphiques
      const { data: newUsersData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      const { data: activityData } = await supabase
        .from('user_progress')
        .select('updated_at')
        .gte('updated_at', startDate.toISOString())
        .order('updated_at', { ascending: true })

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalModules: totalModules || 0,
        totalLessons: totalLessons || 0,
        totalQuizzes: totalQuizzes || 0,
        completedQuizzes: completedQuizzes || 0,
        premiumUsers: premiumUsers || 0,
        completedLessons: completedLessons,
        conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0,
        engagementRate: activeUsers > 0 ? ((completedLessons / (activeUsers * totalLessons || 1)) * 100).toFixed(1) : 0,
      })

      // Préparer les données pour le graphique
      const chartLabels = []
      const newUsersChart = []
      const activityChart = []

      if (timeRange === '7d' || timeRange === '30d') {
        // Données par jour
        for (let i = 0; i < (timeRange === '7d' ? 7 : 30); i++) {
          const date = new Date(startDate)
          date.setDate(startDate.getDate() + i)
          const dateStr = date.toISOString().split('T')[0]
          chartLabels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }))
          
          const dayUsers = newUsersData?.filter(u => u.created_at.startsWith(dateStr)).length || 0
          const dayActivity = activityData?.filter(a => a.updated_at.startsWith(dateStr)).length || 0
          
          newUsersChart.push(dayUsers)
          activityChart.push(dayActivity)
        }
      } else {
        // Données par mois
        const months = timeRange === '90d' ? 3 : 12
        for (let i = 0; i < months; i++) {
          const date = new Date()
          date.setMonth(date.getMonth() - (months - 1 - i))
          const monthStr = date.toISOString().slice(0, 7)
          chartLabels.push(date.toLocaleDateString('fr-FR', { month: 'short' }))
          
          const monthUsers = newUsersData?.filter(u => u.created_at.startsWith(monthStr)).length || 0
          const monthActivity = activityData?.filter(a => a.updated_at.startsWith(monthStr)).length || 0
          
          newUsersChart.push(monthUsers)
          activityChart.push(monthActivity)
        }
      }

      setChartData({
        labels: chartLabels,
        newUsers: newUsersChart,
        activity: activityChart,
      })

    } catch (err) {
      console.error('[AdminAnalyticsPage]', err)
      setError('Impossible de charger les statistiques.')
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    if (!stats || !chartData) return
    
    const csvContent = [
      ['Métrique', 'Valeur'],
      ['Utilisateurs totaux', stats.totalUsers],
      ['Utilisateurs actifs', stats.activeUsers],
      ['Utilisateurs premium', stats.premiumUsers],
      ['Taux de conversion (%)', stats.conversionRate],
      ['Modules', stats.totalModules],
      ['Leçons', stats.totalLessons],
      ['Quiz', stats.totalQuizzes],
      ['Quiz complétés', stats.completedQuizzes],
      ['Leçons complétées', stats.completedLessons],
      ['Taux d\'engagement (%)', stats.engagementRate],
      [],
      ['Période', timeRange],
      ...chartData.labels.map((label, i) => [
        label,
        'Nouveaux utilisateurs: ' + chartData.newUsers[i],
        'Activité: ' + chartData.activity[i]
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-600 mt-2">Analyse détaillée de la plateforme</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">Dernière année</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Utilisateurs totaux"
              value={stats.totalUsers}
              icon={<Users className="w-5 h-5" />}
              color="violet"
              change={stats.activeUsers}
              changeLabel="actifs"
            />
            <KPICard
              title="Taux de conversion"
              value={`${stats.conversionRate}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="green"
              change={stats.premiumUsers}
              changeLabel="premium"
            />
            <KPICard
              title="Leçons complétées"
              value={stats.completedLessons}
              icon={<BookOpen className="w-5 h-5" />}
              color="blue"
              change={stats.totalLessons}
              changeLabel="disponibles"
            />
            <KPICard
              title="Quiz complétés"
              value={stats.completedQuizzes}
              icon={<Clock className="w-5 h-5" />}
              color="pink"
              change={stats.totalQuizzes}
              changeLabel="disponibles"
            />
          </div>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement</h3>
              <div className="space-y-4">
                <MetricRow
                  label="Taux d'engagement"
                  value={`${stats.engagementRate}%`}
                  total="100%"
                  color="violet"
                />
                <MetricRow
                  label="Utilisateurs actifs"
                  value={stats.activeUsers}
                  total={stats.totalUsers}
                  color="green"
                />
                <MetricRow
                  label="Leçons complétées"
                  value={stats.completedLessons}
                  total={stats.totalLessons * stats.activeUsers || 1}
                  color="blue"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenu</h3>
              <div className="space-y-4">
                <MetricRow
                  label="Modules"
                  value={stats.totalModules}
                  total={stats.totalModules}
                  color="violet"
                />
                <MetricRow
                  label="Leçons"
                  value={stats.totalLessons}
                  total={stats.totalLessons}
                  color="blue"
                />
                <MetricRow
                  label="Quiz"
                  value={stats.totalQuizzes}
                  total={stats.totalQuizzes}
                  color="pink"
                />
              </div>
            </div>
          </div>

          {/* Chart Section */}
          {chartData && (
            <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Évolution temporelle</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Nouveaux utilisateurs</h4>
                  <SimpleChart data={chartData.newUsers} labels={chartData.labels} color="violet" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Activité plateforme</h4>
                  <SimpleChart data={chartData.activity} labels={chartData.labels} color="green" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── KPI Card Component ───────────────────────────────────────────────────────
function KPICard({ title, value, icon, color, change, changeLabel }) {
  const colorClasses = {
    violet: 'bg-violet-50 text-violet-600 border-violet-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    pink: 'bg-pink-50 text-pink-600 border-pink-200',
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} flex items-center justify-center`}>
          {icon}
        </div>
        {change !== undefined && (
          <span className="text-xs text-gray-500">
            {change} {changeLabel}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  )
}

// ─── Metric Row Component ─────────────────────────────────────────────────────
function MetricRow({ label, value, total, color }) {
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0
  const colorClasses = {
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    pink: 'bg-pink-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// ─── Simple Chart Component ───────────────────────────────────────────────────
function SimpleChart({ data, labels, color }) {
  const maxValue = Math.max(...data, 1)
  const hasActivity = data.some((v) => v > 0)
  const colorClasses = {
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    pink: 'bg-pink-500',
  }

  if (!hasActivity) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
        Aucune activité enregistrée sur cette période
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((value, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full ${colorClasses[color]} rounded-t transition-all duration-300 hover:opacity-80`}
            style={{ height: `${(value / maxValue) * 100}%` }}
            title={`${labels[index]}: ${value}`}
          />
          <span className="text-xs text-gray-400 rotate-45 origin-left">
            {labels[index]}
          </span>
        </div>
      ))}
    </div>
  )
}
