// src/pages/Admin/AdminFAQsPage.jsx
import { useToast } from '@/components/ui/Toast'
// Page admin pour gérer les FAQs (CRUD)

import { useState, useEffect } from 'react'
import { getAllFAQs, createFAQ, updateFAQ, deleteFAQ } from '@/services/faqService'
import { Plus, Edit, Trash2, Save, GripVertical, Eye, EyeOff } from 'lucide-react'

export default function AdminFAQsPage() {
  const { toast } = useToast()
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchFAQs()
  }, [])

  async function fetchFAQs() {
    setLoading(true)
    setError(null)
    const { faqs: data, error: err } = await getAllFAQs()
    if (err) {
      setError(err)
    } else {
      setFaqs(data)
    }
    setLoading(false)
  }

  async function handleCreate(faqData) {
    setSaving(true)
    const { error: err } = await createFAQ(faqData)
    setSaving(false)
    if (err) {
      toast.error('Erreur lors de la création: ' + err)
    } else {
      setCreateModal(false)
      fetchFAQs()
    }
  }

  async function handleUpdate(id, faqData) {
    setSaving(true)
    const { error: err } = await updateFAQ(id, faqData)
    setSaving(false)
    if (err) {
      toast.error('Erreur lors de la mise à jour: ' + err)
    } else {
      setEditModal(null)
      fetchFAQs()
    }
  }

  async function handleDelete(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) return
    
    const { error: err } = await deleteFAQ(id)
    if (err) {
      toast.error('Erreur lors de la suppression: ' + err)
    } else {
      fetchFAQs()
    }
  }

  async function handleTogglePublish(id, isPublished) {
    const faq = faqs.find(f => f.id === id)
    if (faq) {
      await handleUpdate(id, { ...faq, is_published: !isPublished })
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des FAQs</h1>
          <p className="text-gray-600 mt-2">Gérez les questions fréquentes affichées sur la landing page</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle FAQ
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {faqs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucune FAQ disponible. Créez-en une pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1 text-gray-400">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        faq.is_published 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {faq.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                      {faq.category && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">{faq.answer}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePublish(faq.id, faq.is_published)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title={faq.is_published ? 'Masquer' : 'Publier'}
                    >
                      {faq.is_published ? (
                        <Eye className="w-5 h-5 text-gray-600" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditModal(faq)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
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
        <FAQModal
          mode="create"
          onSave={handleCreate}
          onCancel={() => setCreateModal(false)}
          saving={saving}
        />
      )}

      {/* Modal d'édition */}
      {editModal && (
        <FAQModal
          mode="edit"
          faq={editModal}
          onSave={(data) => handleUpdate(editModal.id, data)}
          onCancel={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Modal de création/édition de FAQ ───────────────────────────────────────
function FAQModal({ mode, faq, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState(
    faq || {
      question: '',
      answer: '',
      category: 'général',
      order_index: 0,
      is_published: true,
    }
  )

  function handleSubmit(e) {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Nouvelle FAQ' : 'Modifier la FAQ'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réponse *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="général">Général</option>
              <option value="pricing">Tarification</option>
              <option value="cours">Cours</option>
              <option value="technique">Technique</option>
              <option value="certification">Certification</option>
              <option value="support">Support</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              min="0"
            />
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
