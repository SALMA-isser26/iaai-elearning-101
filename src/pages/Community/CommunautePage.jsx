// src/pages/Community/CommunautePage.jsx
import { useToast } from '@/components/ui/Toast'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/services/supabaseClient'

// ─── Catégories disponibles ───────────────────────────────────────────────────
const categories = ['Tous', 'Questions', 'Projets', 'Ressources', 'Annonces']

const categoryColors = {
  Questions:  'bg-cyan-100 text-cyan-700',
  Projets:    'bg-violet-100 text-violet-700',
  Ressources: 'bg-yellow-100 text-yellow-700',
  Annonces:   'bg-pink-100 text-pink-700',
}

// ─── Fonction utilitaire : temps relatif ─────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1) return "À l'instant"
  if (mins  < 60) return `Il y a ${mins} min`
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  if (days  <  7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

// ─── Composant PostCard ───────────────────────────────────────────────────────
function PostCard({ post, currentUserId, onLikeToggle }) {
  const initials = (post.author_name || 'AN')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const gradients = [
    'from-cyan-400 to-blue-500',
    'from-violet-400 to-purple-600',
    'from-pink-400 to-rose-500',
    'from-yellow-400 to-orange-500',
    'from-green-400 to-teal-500',
    'from-fuchsia-400 to-violet-600',
  ]
  // Gradient déterministe basé sur l'id de l'auteur
  const grad = gradients[(post.author_id?.charCodeAt(0) || 0) % gradients.length]

  const liked     = post.liked_by?.includes(currentUserId) ?? false
  const likeCount = post.liked_by?.length ?? 0

  return (
    <article className="bg-white rounded-2xl border border-[#ded6f3] p-6 hover:shadow-md hover:border-[#8127cf]/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#17132f]">{post.author_name || 'Anonyme'}</span>
              {post.pinned && (
                <span className="flex items-center gap-1 text-xs text-[#8127cf] bg-[#f0dbff] px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">push_pin</span>
                  Épinglé
                </span>
              )}
            </div>
            <span className="text-xs text-[#68627a]">{timeAgo(post.created_at)}</span>
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[post.category] || 'bg-slate-100 text-slate-700'}`}>
          {post.category}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-base font-bold text-[#17132f] mb-2 group-hover:text-[#8127cf] transition-colors cursor-pointer">
        {post.title}
      </h3>
      <p className="text-sm text-[#68627a] leading-relaxed line-clamp-2 mb-4">
        {post.body}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-5 text-sm text-[#68627a]">
        <button
          onClick={() => onLikeToggle(post.id, liked)}
          className={`flex items-center gap-1.5 transition-colors hover:text-pink-600 ${liked ? 'text-pink-600' : ''}`}
          aria-label={liked ? 'Retirer le like' : 'Liker'}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
          <span className="font-medium">{likeCount}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
          <span className="font-medium">{post.comment_count ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          <span>{post.view_count ?? 0}</span>
        </div>
      </div>
    </article>
  )
}

// ─── Skeleton de chargement ───────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#ded6f3] p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#e5eeff]" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-32 bg-[#e5eeff] rounded" />
          <div className="h-2 w-20 bg-[#e5eeff] rounded" />
        </div>
      </div>
      <div className="h-4 w-3/4 bg-[#e5eeff] rounded" />
      <div className="h-3 w-full bg-[#e5eeff] rounded" />
      <div className="h-3 w-2/3 bg-[#e5eeff] rounded" />
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CommunautePage() {
  const { toast } = useToast()
  const { user } = useAuthStore()

  const [posts,           setPosts]           = useState([])
  const [topMembers,      setTopMembers]      = useState([])
  const [stats,           setStats]           = useState({ discussions: 0, members: 0, replies: 0 })
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [activeCategory,  setActiveCategory]  = useState('Tous')
  const [search,          setSearch]          = useState('')
  const [showModal,       setShowModal]       = useState(false)

  // Formulaire nouveau post
  const [newCategory, setNewCategory] = useState('Questions')
  const [newTitle,    setNewTitle]    = useState('')
  const [newBody,     setNewBody]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  // ── Chargement des données ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Posts — on joint le profil de l'auteur
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select(`
          id,
          title,
          body,
          category,
          pinned,
          liked_by,
          view_count,
          comment_count,
          created_at,
          author_id,
          profiles ( full_name )
        `)
        .order('pinned',      { ascending: false })
        .order('created_at',  { ascending: false })
        .limit(50)

      if (postsError) throw postsError

      const normalized = (postsData || []).map(p => ({
        ...p,
        author_name: p.profiles?.full_name || 'Anonyme',
        liked_by:    p.liked_by || [],
      }))
      setPosts(normalized)

      // Top contributeurs — nombre de posts par utilisateur
      const { data: membersData } = await supabase
        .from('community_posts')
        .select('author_id, profiles ( full_name )')
        .order('created_at', { ascending: false })

      if (membersData) {
        const counts = {}
        membersData.forEach(p => {
          const key  = p.author_id
          const name = p.profiles?.full_name || 'Anonyme'
          counts[key] = counts[key] ? { ...counts[key], count: counts[key].count + 1 } : { name, count: 1 }
        })
        const sorted = Object.entries(counts)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 5)
          .map(([id, v]) => ({ id, name: v.name, count: v.count }))
        setTopMembers(sorted)
      }

      // Stats globales
      const { count: memberCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })

      setStats({
        discussions: normalized.length,
        members:     memberCount || 0,
        replies:     normalized.reduce((a, p) => a + (p.comment_count || 0), 0),
      })
    } catch (err) {
      console.error('Erreur communauté:', err)
      setError('Impossible de charger les discussions. Vérifiez votre connexion ou vos clés Supabase.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Like / Unlike ──────────────────────────────────────────────────────────
  const handleLikeToggle = async (postId, isLiked) => {
    if (!user?.id) return

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked_by = isLiked
        ? p.liked_by.filter(id => id !== user.id)
        : [...p.liked_by, user.id]
      return { ...p, liked_by }
    }))

    // Persistance Supabase
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const newLikedBy = isLiked
      ? post.liked_by.filter(id => id !== user.id)
      : [...post.liked_by, user.id]

    await supabase
      .from('community_posts')
      .update({ liked_by: newLikedBy })
      .eq('id', postId)
  }

  // ── Publier un nouveau post ────────────────────────────────────────────────
  const handleSubmitPost = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user?.id) return
    setSubmitting(true)
    try {
      const { error: insertError } = await supabase
        .from('community_posts')
        .insert({
          author_id:     user.id,
          title:         newTitle.trim(),
          body:          newBody.trim(),
          category:      newCategory,
          liked_by:      [],
          view_count:    0,
          comment_count: 0,
          pinned:        false,
        })
      if (insertError) throw insertError

      setNewTitle('')
      setNewBody('')
      setNewCategory('Questions')
      setShowModal(false)
      await fetchData()
    } catch (err) {
      console.error('Erreur publication:', err)
      toast.error('Erreur lors de la publication. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filtrage local ─────────────────────────────────────────────────────────
  const filtered = posts.filter(p => {
    const matchCat    = activeCategory === 'Tous' || p.category === activeCategory
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.body.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const pinned  = filtered.filter(p =>  p.pinned)
  const regular = filtered.filter(p => !p.pinned)

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f5ff] pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold font-display text-[#0b1c30]">Communauté</h2>
          <p className="text-[#68627a] mt-1">Échangez, partagez et apprenez ensemble</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm
                     hover:shadow-lg hover:shadow-[#8127cf]/20 hover:scale-105 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Nouvelle discussion
        </button>
      </div>

      {/* ── Message d'erreur ──────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">error</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Erreur de chargement</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={fetchData} className="ml-auto text-xs text-red-700 font-bold hover:underline shrink-0">
            Réessayer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Barre de recherche + filtres */}
          <div className="bg-white rounded-2xl border border-[#ded6f3] p-4">
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#68627a] text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Rechercher dans la communauté..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm
                           focus:outline-none focus:border-[#8127cf] focus:ring-2 focus:ring-[#8127cf]/20 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-[#8127cf] text-white shadow-sm'
                      : 'bg-[#f0dbff] text-[#8127cf] hover:bg-[#8127cf]/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: 'forum',        value: stats.discussions, label: 'Discussions'    },
              { icon: 'group',        value: stats.members,     label: 'Membres actifs' },
              { icon: 'trending_up',  value: stats.replies,     label: 'Réponses'       },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-[#ded6f3] p-4 text-center">
                <span className="material-symbols-outlined text-[#8127cf] text-[24px] mb-1">{s.icon}</span>
                <p className="text-xl font-bold text-[#17132f]">{s.value}</p>
                <p className="text-xs text-[#68627a]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Posts */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* Posts épinglés */}
              {pinned.length > 0 && (
                <div className="space-y-3">
                  {pinned.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user?.id}
                      onLikeToggle={handleLikeToggle}
                    />
                  ))}
                </div>
              )}

              {/* Posts normaux */}
              {regular.length > 0 ? (
                <div className="space-y-3">
                  {regular.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user?.id}
                      onLikeToggle={handleLikeToggle}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#ded6f3] p-12 text-center">
                  <span className="material-symbols-outlined text-[#cfc2d6] text-[48px] mb-3">forum</span>
                  <p className="text-[#68627a] font-medium">
                    {search ? 'Aucune discussion ne correspond à votre recherche.' : 'Aucune discussion dans cette catégorie.'}
                  </p>
                  <p className="text-sm text-[#68627a]/70 mt-1">
                    {search ? 'Essayez avec d\'autres mots-clés.' : 'Soyez le premier à lancer la conversation !'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Colonne latérale ──────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Top contributeurs */}
          <div className="bg-white rounded-2xl border border-[#ded6f3] p-6">
            <h3 className="text-base font-bold text-[#17132f] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500 text-[20px]">emoji_events</span>
              Top contributeurs
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-[#e5eeff]" />
                    <div className="flex-1 h-3 bg-[#e5eeff] rounded" />
                  </div>
                ))}
              </div>
            ) : topMembers.length > 0 ? (
              <div className="space-y-3">
                {topMembers.map((m, i) => {
                  const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  const gradients = ['from-cyan-400 to-blue-500','from-violet-400 to-purple-600','from-pink-400 to-rose-500','from-yellow-400 to-orange-500','from-green-400 to-teal-500']
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-[#68627a] text-center">{i + 1}</span>
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#17132f] truncate">{m.name}</p>
                      </div>
                      <span className="text-xs text-[#68627a]">{m.count} posts</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[#68627a] text-center py-4">Aucun contributeur pour l'instant.</p>
            )}
          </div>

          {/* Règles de la communauté */}
          <div className="bg-white rounded-2xl border border-[#ded6f3] p-6">
            <h3 className="text-base font-bold text-[#17132f] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8127cf] text-[20px]">gavel</span>
              Règles de la communauté
            </h3>
            <ul className="space-y-2.5">
              {[
                'Soyez respectueux et bienveillants',
                'Partagez uniquement des contenus pertinents',
                'Citez vos sources et ressources',
                'Pas de spam ni de publicité',
                'Aidez avant de demander',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#68627a]">
                  <span className="w-5 h-5 rounded-full bg-[#f0dbff] text-[#8127cf] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* ARIA suggestion */}
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #8127cf 0%, #0891b2 100%)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              <span className="font-bold text-sm">ARIA vous suggère</span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">
              Participez aux discussions pour renforcer votre compréhension et aider la communauté à grandir !
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal nouvelle discussion ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-display text-[#17132f]">Nouvelle discussion</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#f0dbff] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[#68627a] text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#17132f] mb-1.5">Catégorie</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm focus:outline-none focus:border-[#8127cf] focus:ring-2 focus:ring-[#8127cf]/20"
                >
                  {categories.filter(c => c !== 'Tous').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#17132f] mb-1.5">Titre</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Posez une question claire et précise..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm focus:outline-none focus:border-[#8127cf] focus:ring-2 focus:ring-[#8127cf]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#17132f] mb-1.5">Contenu</label>
                <textarea
                  rows={5}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Décrivez votre question ou partagez vos connaissances..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm focus:outline-none focus:border-[#8127cf] focus:ring-2 focus:ring-[#8127cf]/20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#ded6f3] text-[#68627a] text-sm font-medium hover:bg-[#f8f5ff] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={submitting || !newTitle.trim() || !newBody.trim()}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold hover:shadow-lg hover:shadow-[#8127cf]/20 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Publication...
                  </>
                ) : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
