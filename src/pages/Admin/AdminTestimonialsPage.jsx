// src/pages/Admin/AdminTestimonialsPage.jsx
import { useToast } from '@/components/ui/Toast'
// Page admin pour gérer les témoignages (CRUD)

import { useState, useEffect } from 'react'
import { getAllTestimonials, updateTestimonial, deleteTestimonial, approveTestimonial, rejectTestimonial } from '@/services/testimonialService'
import { Edit, Trash2, Save, Star, Check, XCircle } from 'lucide-react'

export default function AdminTestimonialsPage() {
  const { toast } = useToast()
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchTestimonials()
  }, [])

  async function fetchTestimonials() {
    setLoading(true)
    setError(null)
    const { testimonials: data, error: err } = await getAllTestimonials()
    if (err) {
      setError(err)
    } else {
      setTestimonials(data)
    }
    setLoading(false)
  }

  async function handleUpdate(id, testimonialData) {
    setSaving(true)
    const { error: err } = await updateTestimonial(id, testimonialData)
    setSaving(false)
    if (err) {
      toast.error('Erreur lors de la mise à jour: ' + err)
    } else {
      setEditModal(null)
      fetchTestimonials()
    }
  }

  async function handleDelete(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce témoignage ?')) return
    
    const { error: err } = await deleteTestimonial(id)
    if (err) {
      toast.error('Erreur lors de la suppression: ' + err)
    } else {
      fetchTestimonials()
    }
  }

  async function handleApprove(id) {
    const { error: err } = await approveTestimonial(id)
    if (err) {
      toast.error('Erreur lors de l\'approbation: ' + err)
    } else {
      fetchTestimonials()
    }
  }

  async function handleReject(id) {
    const { error: err } = await rejectTestimonial(id)
    if (err) {
      toast.error('Erreur lors du rejet: ' + err)
    } else {
      fetchTestimonials()
    }
  }

  const filteredTestimonials = filterStatus === 'all' 
    ? testimonials 
    : filterStatus === 'published'
    ? testimonials.filter(t => t.is_published)
    : testimonials.filter(t => !t.is_published)

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Témoignages</h1>
          <p className="text-gray-600 mt-2">Modérez les avis des apprenants</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="all">Tous</option>
            <option value="published">Publiés</option>
            <option value="pending">En attente</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {testimonials.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucun témoignage disponible.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {testimonial.avatar_url ? (
                    <img
                      src={testimonial.avatar_url}
                      alt={testimonial.full_name}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {testimonial.full_name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{testimonial.full_name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        testimonial.is_published 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {testimonial.is_published ? 'Publié' : 'En attente'}
                      </span>
                      {testimonial.is_featured && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                          Vedette
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-2">{testimonial.role}</p>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-2">{testimonial.content}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= testimonial.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-500">({testimonial.rating}/5)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!testimonial.is_published && (
                      <>
                        <button
                          onClick={() => handleApprove(testimonial.id)}
                          className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                          title="Approuver"
                        >
                          <Check className="w-5 h-5 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleReject(testimonial.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Rejeter"
                        >
                          <XCircle className="w-5 h-5 text-red-600" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setEditModal(testimonial)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(testimonial.id)}
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

      {/* Modal d'édition */}
      {editModal && (
        <TestimonialModal
          testimonial={editModal}
          onSave={(data) => handleUpdate(editModal.id, data)}
          onCancel={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Modal d'édition de témoignage ───────────────────────────────────────────────
function TestimonialModal({ testimonial, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState({
    full_name: testimonial.full_name,
    role: testimonial.role,
    avatar_url: testimonial.avatar_url || '',
    content: testimonial.content,
    rating: testimonial.rating,
    is_published: testimonial.is_published,
    is_featured: testimonial.is_featured,
  })

  function handleSubmit(e) {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Modifier le témoignage</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de l'avatar
            </label>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Témoignage *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (1-5)
            </label>
            <select
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>{rating} étoiles</option>
              ))}
            </select>
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
              Publier
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_featured"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
            />
            <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">
              Mettre en vedette (carousel)
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
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
