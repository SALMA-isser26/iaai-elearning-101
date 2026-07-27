import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    avgProgress: 0,
    totalModules: 0,
  })
  const [moduleProgress, setModuleProgress] = useState([])
  const [activityData, setActivityData] = useState([])

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Nombre total d'étudiants
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Étudiants actifs (activité dans les 7 derniers jours)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: activeStudents } = await supabase
        .from('user_activity')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo)

      // Progression moyenne
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('completed')

      const avgProgress = progressData
        ? (progressData.filter(p => p.completed).length / progressData.length) * 100
        : 0

      // Nombre total de modules
      const { count: totalModules } = await supabase
        .from('modules')
        .select('*', { count: 'exact', head: true })

      // Progression par module
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, order_index')
        .order('order_index')

      const moduleProgressData = await Promise.all(
        (modules || []).map(async (module) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', module.id)

          const { data: completedLessons } = await supabase
            .from('user_progress')
            .select('lesson_id')
            .eq('completed', true)
            .in('lesson_id', (lessons || []).map(l => l.id))

          const totalLessons = lessons?.length || 0
          const completedCount = completedLessons?.length || 0
          const completionRate = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

          return {
            name: module.title.substring(0, 20) + '...',
            completion: Math.round(completionRate),
          }
        })
      )

      // Données d'activité (derniers 7 jours)
      const activityByDay = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' })

        const { count } = await supabase
          .from('user_activity')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateStr)
          .lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString())

        activityByDay.push({ day: dayName, activities: count || 0 })
      }

      setStats({
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        avgProgress: Math.round(avgProgress),
        totalModules: totalModules || 0,
      })
      setModuleProgress(moduleProgressData)
      setActivityData(activityByDay)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Analytics Admin
        </h1>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Rafraîchir
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Étudiants"
          value={stats.totalStudents}
          color="bg-purple-500"
        />
        <StatCard
          title="Étudiants Actifs (7j)"
          value={stats.activeStudents}
          color="bg-pink-500"
        />
        <StatCard
          title="Progression Moyenne"
          value={`${stats.avgProgress}%`}
          color="bg-cyan-500"
        />
        <StatCard
          title="Total Modules"
          value={stats.totalModules}
          color="bg-amber-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-purple-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Progression par Module
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moduleProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completion" fill="#8127cf" name="Taux de complétion (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-purple-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Activité des 7 derniers jours
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="activities"
                stroke="#ec4899"
                strokeWidth={2}
                name="Activités"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-purple-100 dark:border-slate-700">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{title}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
      <div className={`w-full h-2 ${color} rounded-full mt-4 opacity-20`} />
    </div>
  )
}
