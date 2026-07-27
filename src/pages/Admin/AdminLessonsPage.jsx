// src/pages/Admin/AdminLessonsPage.jsx
import { useToast } from '@/components/ui/Toast'
// Page admin pour gérer les leçons (CRUD)

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getAllLessons, getAllModules, createLesson, updateLesson, deleteLesson } from '@/services/courseService'
import { Plus, Edit, Trash2, Save, Eye, Clock, BookOpen } from 'lucide-react'

export default function AdminLessonsPage() {
  const { toast } = useToast()
  const [lessons, setLessons] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterModule, setFilterModule] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [lessonsData, modulesData] = await Promise.all([
        getAllLessons(),
        getAllModules(),
      ])
      setLessons(lessonsData)
      setModules(modulesData)
    } catch (err) {
      setError('Erreur lors du chargement des données')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(lessonData) {
    setSaving(true)
    try {
      await createLesson(lessonData)
      setCreateModal(false)
      fetchData()
    } catch (err) {
      toast.error('Erreur lors de la création: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id, lessonData) {
    setSaving(true)
    try {
      await updateLesson(id, lessonData)
      setEditModal(null)
      fetchData()
    } catch (err) {
      toast.error('Erreur lors de la mise à jour: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette leçon ?')) return
    
    try {
      await deleteLesson(id)
      fetchData()
    } catch (err) {
      toast.error('Erreur lors de la suppression: ' + err.message)
    }
  }

  const filteredLessons = filterModule === 'all' 
    ? lessons 
    : lessons.filter(l => l.module_id === filterModule)

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Leçons</h1>
          <p className="text-gray-600 mt-2">Gérez toutes les leçons de la plateforme</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle leçon
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {/* Filtre par module */}
      <div className="mb-6">
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="all">Tous les modules</option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredLessons.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucune leçon trouvée.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLessons.map((lesson) => (
              <div key={lesson.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        lesson.is_premium 
                          ? 'bg-violet-100 text-violet-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {lesson.is_premium ? 'Premium' : 'Gratuit'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        lesson.is_published 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {lesson.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {lesson.modules?.title || 'Sans module'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">{lesson.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {lesson.duration_minutes} min
                        </span>
                      )}
                      <span>Ordre: {lesson.order_index}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={ROUTES.LESSON(lesson.id)}
                      target="_blank"
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Voir la leçon"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </Link>
                    <button
                      onClick={() => setEditModal(lesson)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {createModal && (
        <LessonModal
          mode="create"
          modules={modules}
          onSave={handleCreate}
          onCancel={() => setCreateModal(false)}
          saving={saving}
        />
      )}

      {/* Modal d'édition */}
      {editModal && (
        <LessonModal
          mode="edit"
          lesson={editModal}
          modules={modules}
          onSave={(data) => handleUpdate(editModal.id, data)}
          onCancel={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Modal de création/édition de leçon ─────────────────────────────────────────
function LessonModal({ mode, lesson, modules, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState(
    lesson || {
      module_id: '',
      title: '',
      description: '',
      content: '',
      video_url: '',
      duration_minutes: '',
      order_index: 0,
      is_premium: true,
      is_published: false,
    }
  )

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...formData,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      order_index: parseInt(formData.order_index) || 0,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Nouvelle leçon' : 'Modifier la leçon'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module *
            </label>
            <select
              value={formData.module_id}
              onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            >
              <option value="">Sélectionner un module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenu (Markdown)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-mono text-sm"
              placeholder="Contenu de la leçon en format Markdown..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de la vidéo
            </label>
            <input
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée (minutes)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordre
              </label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_premium"
              checked={formData.is_premium}
              onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
              className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
            />
            <label htmlFor="is_premium" className="text-sm font-medium text-gray-700">
              Leçon premium
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
            />
            <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
              Publier immédiatement
            </label>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {mode === 'create' ? 'Créer' : 'Enregistrer'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
