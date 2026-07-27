// src/pages/Profile/BookmarksPage.jsx
// Page pour afficher les leçons favorites de l'utilisateur

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/store/authStore'
import { getUserBookmarks } from '@/services/bookmarkService'
import { BookmarkCheck, Clock, BookOpen } from 'lucide-react'

export default function BookmarksPage() {
  const { user } = useAuthStore()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.id) {
      fetchBookmarks()
    }
  }, [user?.id])

  async function fetchBookmarks() {
    setLoading(true)
    setError(null)
    const { bookmarks: data, error: err } = await getUserBookmarks(user.id)
    if (err) {
      setError(err)
    } else {
      setBookmarks(data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes Favoris</h1>
        <p className="text-gray-600 mt-2">
          Retrouvez facilement les leçons que vous avez marquées comme favorites
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {!user?.id && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <BookmarkCheck className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Connectez-vous pour voir vos favoris
          </h3>
          <p className="text-yellow-700 mb-4">
            Vous devez être connecté pour accéder à vos leçons favorites.
          </p>
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      )}

      {user?.id && bookmarks.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <BookmarkCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucun favori pour le moment
          </h3>
          <p className="text-gray-500 mb-6">
            Commencez à ajouter des leçons à vos favoris pour les retrouver facilement ici.
          </p>
          <Link
            to={ROUTES.CURRICULUM}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Explorer les cours
          </Link>
        </div>
      )}

      {bookmarks.length > 0 && (
        <div className="grid gap-4">
          {bookmarks.map((bookmark) => (
            <Link
              key={bookmark.id}
              to={ROUTES.LESSON(bookmark.lesson_id)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {bookmark.lessons?.title || 'Leçon sans titre'}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2 line-clamp-2">
                    {bookmark.lessons?.description || 'Pas de description'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {bookmark.lessons?.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {bookmark.lessons.duration_minutes} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BookmarkCheck className="w-4 h-4" />
                      Ajouté le {new Date(bookmark.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-violet-600 font-semibold text-sm">
                      {bookmark.lessons?.order_index || '?'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
