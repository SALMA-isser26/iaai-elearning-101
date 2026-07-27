// src/pages/Admin/AdminQuizzesPage.jsx
import { useToast } from '@/components/ui/Toast'
// Page admin pour gérer les quiz (CRUD)

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getAllQuizzes, createQuiz, updateQuiz, deleteQuiz, getQuestionsByQuiz } from '@/services/quizService'
import { getAllModules } from '@/services/courseService'
import { Plus, Edit, Trash2, Save, Eye, Clock, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

export default function AdminQuizzesPage() {
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterModule, setFilterModule] = useState('all')
  const [expandedQuiz, setExpandedQuiz] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [quizzesData, modulesData] = await Promise.all([
        getAllQuizzes(),
        getAllModules(),
      ])
      setQuizzes(quizzesData)
      setModules(modulesData)
    } catch (err) {
      setError('Erreur lors du chargement des données')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(quizData) {
    setSaving(true)
    try {
      await createQuiz(quizData)
      setCreateModal(false)
      fetchData()
    } catch (err) {
      toast.error('Erreur lors de la création: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id, quizData) {
    setSaving(true)
    try {
      await updateQuiz(id, quizData)
      setEditModal(null)
      fetchData()
    } catch (err) {
      toast.error('Erreur lors de la mise à jour: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ? Cette action supprimera également toutes les questions associées.')) return
    
    try {
      await deleteQuiz(id)
      fetchData()
    } catch (err) {
      toast.error('Erreur lors de la suppression: ' + err.message)
    }
  }

  async function handleViewQuestions(quizId) {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null)
      return
    }
    
    try {
      const questions = await getQuestionsByQuiz(quizId)
      setQuizzes(quizzes.map(q => 
        q.id === quizId ? { ...q, questions } : q
      ))
      setExpandedQuiz(quizId)
    } catch (err) {
      console.error('Erreur chargement questions:', err)
    }
  }

  const filteredQuizzes = filterModule === 'all' 
    ? quizzes 
    : quizzes.filter(q => q.module_id === filterModule)

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Quiz</h1>
          <p className="text-gray-600 mt-2">Gérez tous les quiz de la plateforme</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau quiz
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
        {filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucun quiz trouvé.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.id}>
                <div className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <HelpCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          quiz.is_published 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {quiz.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {quiz.modules?.title || 'Sans module'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{quiz.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {quiz.time_limit_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {quiz.time_limit_minutes} min
                          </span>
                        )}
                        <span>Score requis: {quiz.passing_score}%</span>
                        <span className="flex items-center gap-1 cursor-pointer hover:text-violet-600" onClick={() => handleViewQuestions(quiz.id)}>
                          <HelpCircle className="w-4 h-4" />
                          {quiz.questions?.length || '?'} questions
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleViewQuestions(quiz.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Voir les questions"
                      >
                        {expandedQuiz === quiz.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                      <Link
                        to={ROUTES.QUIZ(quiz.id)}
                        target="_blank"
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Voir le quiz"
                      >
                        <Eye className="w-5 h-5 text-gray-600" />
                      </Link>
                      <button
                        onClick={() => setEditModal(quiz)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Questions expandable */}
                {expandedQuiz === quiz.id && quiz.questions && (
                  <div className="px-6 pb-6 pt-0 bg-gray-50 border-t border-gray-100">
                    <div className="mt-4 space-y-3">
                      {quiz.questions.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune question pour ce quiz.</p>
                      ) : (
                        quiz.questions.map((question, idx) => (
                          <div key={question.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{question.question_text}</p>
                                {question.answers && question.answers.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {question.answers.map((answer) => (
                                      <div key={answer.id} className="flex items-center gap-2 text-xs">
                                        <span className={answer.is_correct ? 'text-green-600' : 'text-gray-500'}>
                                          {answer.is_correct ? '✓' : '○'}
                                        </span>
                                        <span className="text-gray-600">{answer.answer_text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {createModal && (
        <QuizModal
          mode="create"
          modules={modules}
          onSave={handleCreate}
          onCancel={() => setCreateModal(false)}
          saving={saving}
        />
      )}

      {/* Modal d'édition */}
      {editModal && (
        <QuizModal
          mode="edit"
          quiz={editModal}
          modules={modules}
          onSave={(data) => handleUpdate(editModal.id, data)}
          onCancel={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Modal de création/édition de quiz ───────────────────────────────────────────
function QuizModal({ mode, quiz, modules, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState(
    quiz || {
      module_id: '',
      title: '',
      description: '',
      time_limit_minutes: '',
      passing_score: 80,
      is_published: false,
    }
  )

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...formData,
      time_limit_minutes: formData.time_limit_minutes ? parseInt(formData.time_limit_minutes) : null,
      passing_score: parseInt(formData.passing_score) || 80,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Nouveau quiz' : 'Modifier le quiz'}
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite de temps (minutes)
              </label>
              <input
                type="number"
                value={formData.time_limit_minutes}
                onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                min="0"
                placeholder="Illimité si vide"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score requis (%)
              </label>
              <input
                type="number"
                value={formData.passing_score}
                onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                min="0"
                max="100"
                required
              />
            </div>
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
