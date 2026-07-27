// src/pages/Profile/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { getOverallProgress } from '@/services/progressService'
import { getUserQuizAttempts } from '@/services/quizService'
import { getUserCertificates } from '@/services/certificateService'
import { supabase } from '@/services/supabaseClient'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="pb-12 animate-pulse space-y-6">
      <div className="h-8 w-48 bg-[#e5eeff] rounded" />
      <div className="h-40 bg-[#e5eeff] rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#e5eeff] rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-[#e5eeff] rounded-2xl" />
        <div className="h-64 bg-[#e5eeff] rounded-2xl" />
      </div>
    </div>
  )
}

function formatRelativeDate(value) {
  if (!value) return 'Récemment'
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 1)   return 'Il y a moins d\'1h'
  if (hours < 24)  return `Il y a ${hours}h`
  if (days === 1)  return 'Hier'
  return `Il y a ${days} jours`
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const fullName = user?.fullName || 'Apprenant'
  const email    = user?.email    || ''
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const [progress,      setProgress]      = useState(null)
  const [quizAttempts,  setQuizAttempts]  = useState([])
  const [certificates,  setCertificates]  = useState([])
  const [activity,      setActivity]      = useState([])
  const [memberSince,   setMemberSince]   = useState('')
  const [loading,       setLoading]       = useState(true)
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [bio,           setBio]           = useState('')

  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      try {
        const [prog, attempts, certs, actRes, profileRes] = await Promise.all([
          getOverallProgress(user.id),
          getUserQuizAttempts(user.id),
          getUserCertificates(user.id),
          supabase
            .from('user_activity')
            .select('type, title, detail, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('profiles')
            .select('created_at, avatar_url, bio')
            .eq('id', user.id)
            .single(),
        ])

        setProgress(prog)
        setQuizAttempts(attempts || [])
        setCertificates(certs || [])
        setActivity(actRes.data || [])
        setAvatarUrl(profileRes.data?.avatar_url || null)
        setBio(profileRes.data?.bio || '')

        if (profileRes.data?.created_at) {
          setMemberSince(
            new Date(profileRes.data.created_at).toLocaleDateString('fr-FR', {
              month: 'long', year: 'numeric'
            })
          )
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.id])

  if (loading) return <ProfileSkeleton />

  const quizPassed   = quizAttempts.filter(a => a.passed).length
  const studyMinutes = (progress?.completedLessons || 0) * 8
  const studyTime    = studyMinutes >= 60
    ? `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}min`
    : `${studyMinutes}min`

  const stats = [
    { value: `${progress?.percent || 0}%`, label: 'Progression globale',  color: 'text-[#8127cf]', border: 'border-[#8127cf]/10' },
    { value: studyTime,                     label: 'Temps apprentissage',   color: 'text-blue-600',  border: 'border-blue-100'     },
    { value: `${quizPassed}`,               label: 'Quiz réussis',          color: 'text-pink-600',  border: 'border-pink-100'     },
    { value: `${certificates.length}`,      label: 'Certificat(s) obtenu(s)', color: 'text-yellow-500', border: 'border-yellow-100' },
  ]

  const badges = [
    {
      icon: 'rocket_launch', label: 'AI Explorer',
      status: (progress?.completedLessons || 0) >= 1 ? 'done' : 'locked',
      bg: 'bg-yellow-100', text: 'text-yellow-600',
    },
    {
      icon: 'code', label: 'Code Starter',
      status: (progress?.completedLessons || 0) >= 5 ? 'done' : 'locked',
      bg: 'bg-[#e5eeff]', text: 'text-[#7e7385]',
    },
    {
      icon: 'emoji_events', label: 'Quiz Master',
      status: quizPassed >= 3 ? 'done' : 'locked',
      bg: 'bg-[#e5eeff]', text: 'text-[#7e7385]',
    },
  ]

  return (
    <div className="pb-12">

      {/* ── Titre ──────────────────────────────────────────────────────────── */}
      <h2 className="text-3xl font-bold font-display text-[#0b1c30] mb-6">Mon Profil</h2>

      {/* ── Header card ────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#8127cf]/10
                          rounded-2xl p-8 flex flex-col md:flex-row items-center
                          gap-8 shadow-sm mb-6">
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full flex items-center justify-center
                            text-white text-4xl font-bold"
                 style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}>
              {initials}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold font-display text-[#0b1c30]">{fullName}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold
                              ${user?.plan === 'premium'
                                ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-pink-50 text-pink-600'}`}>
              {user?.plan === 'premium' ? '⭐ Plan Premium' : 'Plan Gratuit'}
            </span>
          </div>
          <p className="text-[#7e7385] text-sm mb-1">{email}</p>
          {memberSince && (
            <p className="text-xs text-[#7e7385]/70">Membre depuis {memberSince}</p>
          )}
          {bio && (
            <p className="text-sm text-[#4d4354] mt-2 max-w-md">{bio}</p>
          )}
        </div>

        {/* Bouton modifier */}
        <Link
          to={ROUTES.SETTINGS}
          className="px-8 py-3 rounded-full text-white font-bold text-sm
                     hover:shadow-lg hover:shadow-[#8127cf]/20 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
        >
          Modifier mon profil
        </Link>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-xl p-6 border ${stat.border} flex flex-col gap-1`}>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-xs text-[#7e7385]">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* ── Layout 2 colonnes ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne gauche (2/3) ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Mon parcours */}
          <section className="bg-white rounded-2xl p-8 border border-[#8127cf]/10 shadow-sm">
            <h4 className="text-xl font-bold font-display text-[#0b1c30] mb-6">Mon Parcours</h4>
            <div className="flex flex-col gap-4">
              <div className="h-2 w-full bg-[#e5eeff] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress?.percent || 0}%`,
                    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[#7e7385]">
                <span className="text-sm">
                  {progress?.completedLessons || 0}/{progress?.totalLessons || 0} leçons terminées
                </span>
                <span className="text-sm font-bold text-[#8127cf]">{progress?.percent || 0}%</span>
              </div>
              <div className="mt-4 pt-4 border-t border-[#f0f0f5] flex justify-end">
                <Link
                  to={ROUTES.CURRICULUM}
                  className="px-6 py-2.5 rounded-xl text-white font-bold text-sm
                             flex items-center gap-2 hover:shadow-md transition-all"
                  style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                >
                  Continuer mon parcours
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Mes Badges */}
          <section className="bg-white rounded-2xl p-8 border border-[#8127cf]/10 shadow-sm">
            <h4 className="text-xl font-bold font-display text-[#0b1c30] mb-8">Mes Badges</h4>
            <div className="grid grid-cols-3 gap-6">
              {badges.map((badge, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center text-center gap-3 p-4
                              rounded-xl bg-[#f8f5ff]/50
                              ${badge.status === 'locked' ? 'grayscale opacity-60' : ''}`}
                >
                  <div className={`w-16 h-16 rounded-full ${badge.bg}
                                  flex items-center justify-center ${badge.text}`}>
                    <span className="material-symbols-outlined text-[32px]">{badge.icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-[#0b1c30] text-sm">{badge.label}</p>
                    <span className={`text-xs font-bold flex items-center gap-1
                                     ${badge.status === 'done' ? 'text-green-600' : 'text-[#7e7385]'}`}>
                      {badge.status === 'done' ? (
                        <>
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Obtenu
                        </>
                      ) : 'Verrouillé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ── Colonne droite (1/3) ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-8 border border-[#8127cf]/10
                            shadow-sm flex flex-col gap-6">
          <h4 className="text-xl font-bold font-display text-[#0b1c30]">Activité récente</h4>

          {activity.length === 0 ? (
            <p className="text-sm text-[#7e7385] text-center py-8">
              Commencez votre première leçon !
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {activity.map((item, i) => {
                const iconMap = {
                  quiz:        { icon: 'check_circle', bg: 'bg-green-100',  text: 'text-green-600'  },
                  lesson:      { icon: 'play_circle',  bg: 'bg-blue-100',   text: 'text-blue-600'   },
                  certificate: { icon: 'emoji_events', bg: 'bg-yellow-100', text: 'text-yellow-600' },
                  module:      { icon: 'emoji_events', bg: 'bg-purple-100', text: 'text-purple-600' },
                }
                const style = iconMap[item.type] || iconMap.lesson
                return (
                  <div key={i} className="flex gap-4">
                    <div className={`mt-1 w-8 h-8 rounded-full ${style.bg}
                                    flex items-center justify-center ${style.text} flex-shrink-0`}>
                      <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#0b1c30]">{item.title}</span>
                      <span className="text-xs text-[#7e7385]">{formatRelativeDate(item.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}