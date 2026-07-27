// src/services/quizService.js
import { supabase } from './supabaseClient'

// ─── Récupérer le quiz d'un module ───────────────────────────────────────────

export async function getQuizByModule(moduleId) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      questions (
        id,
        question_text,
        order_index,
        answers (id, answer_text)
      )
    `)
    .eq('module_id', moduleId)
    .single()

  if (error) throw error

  // Trier les questions par order_index
  if (data?.questions) {
    data.questions.sort((a, b) => a.order_index - b.order_index)
  }

  return data
}

// ─── Soumettre une tentative de quiz ─────────────────────────────────────────
//
// CORRECTION : le seuil de réussite était hardcodé à 80.
// La table quizzes a un champ passing_score configurable par quiz.
// → On passe passingScore en paramètre (défaut : 80 pour la rétrocompatibilité).
//
// CORRECTION : filtrer les réponses nulles (question sautée via expiration du timer).
// Avant : une réponse { questionId, answerId: null } pouvait fausser le score.
//
// CORRECTION : vérification défensive si questions.length === 0
// pour éviter une division par zéro.

export async function submitQuizAttempt(_userId, quizId, _moduleId, answers, _passingScore = 80) {
  // Le calcul et l'insertion sont réalisés côté base. Le client ne fournit plus
  // le score, le statut de réussite ni le module à enregistrer.
  const { data, error } = await supabase
    .rpc('submit_quiz_attempt', {
      p_quiz_id: quizId,
      p_answers: answers,
    })
    .single()

  if (error) throw error
  return data
}

// ─── Récupérer les tentatives d'un utilisateur ───────────────────────────────

export async function getUserQuizAttempts(userId) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(title, module_id), modules(title)')
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false })

  if (error) throw error
  return data
}

// ─── Meilleur score pour un quiz ─────────────────────────────────────────────

export async function getBestScore(userId, quizId) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('score, passed')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// ─── CRUD Quiz (Admin) ────────────────────────────────────────────────────────

export async function getAllQuizzes() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, modules(title)')
    .order('module_id', { ascending: true })

  if (error) throw error
  return data
}

export async function createQuiz(quizData) {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      module_id: quizData.module_id,
      title: quizData.title,
      description: quizData.description || null,
      time_limit_minutes: quizData.time_limit_minutes || null,
      passing_score: quizData.passing_score || 80,
      is_published: quizData.is_published !== undefined ? quizData.is_published : false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuiz(quizId, quizData) {
  const { data, error } = await supabase
    .from('quizzes')
    .update({
      module_id: quizData.module_id,
      title: quizData.title,
      description: quizData.description,
      time_limit_minutes: quizData.time_limit_minutes,
      passing_score: quizData.passing_score,
      is_published: quizData.is_published,
    })
    .eq('id', quizId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuiz(quizId) {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)

  if (error) throw error
  return true
}

// ─── CRUD Questions (Admin) ───────────────────────────────────────────────────

export async function getQuestionsByQuiz(quizId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*, answers(*)')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

export async function createQuestion(questionData) {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      quiz_id: questionData.quiz_id,
      question_text: questionData.question_text,
      order_index: questionData.order_index || 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuestion(questionId, questionData) {
  const { data, error } = await supabase
    .from('questions')
    .update({
      question_text: questionData.question_text,
      order_index: questionData.order_index,
    })
    .eq('id', questionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuestion(questionId) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) throw error
  return true
}

// ─── CRUD Answers (Admin) ─────────────────────────────────────────────────────

export async function createAnswer(answerData) {
  const { data, error } = await supabase
    .from('answers')
    .insert({
      question_id: answerData.question_id,
      answer_text: answerData.answer_text,
      is_correct: answerData.is_correct || false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAnswer(answerId, answerData) {
  const { data, error } = await supabase
    .from('answers')
    .update({
     answer_text: answerData.answer_text,
      is_correct: answerData.is_correct,
    })
    .eq('id', answerId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAnswer(answerId) {
  const { error } = await supabase
    .from('answers')
    .delete()
    .eq('id', answerId)

  if (error) throw error
  return true
}
