// src/services/quizScoring.js
// Logique de calcul du score d'un quiz, extraite de quizService.js pour être
// testable unitairement (fonction pure, aucun appel réseau).
//
// Règles (voir historique des corrections dans quizService.js) :
//  - les réponses avec answerId null/undefined (question sautée via expiration
//    du timer) sont ignorées du calcul
//  - le seuil de réussite est configurable par quiz (passingScore), 80 par défaut
//  - division par zéro protégée si `questions` est vide

/**
 * @param {Array<{id: string, answers: Array<{id: string, is_correct: boolean}>}>} questions
 *   Les questions du quiz avec leurs réponses et l'indicateur is_correct (source : la base,
 *   jamais le client — sécurité).
 * @param {Array<{questionId: string, answerId: string|null}>} answers
 *   Les réponses données par l'apprenant.
 * @param {number} [passingScore=80]
 *   Score minimum (en %) pour valider le quiz.
 * @returns {{ correct: number, total: number, score: number, passed: boolean, validAnswers: Array }}
 */
export function calculateQuizScore(questions, answers, passingScore = 80) {
  if (!questions || questions.length === 0) {
    throw new Error('Aucune question trouvée pour ce quiz.')
  }

  const validAnswers = (answers || []).filter(
    (a) => a.answerId !== null && a.answerId !== undefined
  )

  let correct = 0
  for (const answer of validAnswers) {
    const question = questions.find((q) => q.id === answer.questionId)
    if (!question) continue
    const selectedAnswer = question.answers.find((a) => a.id === answer.answerId)
    if (selectedAnswer?.is_correct) correct++
  }

  const total = questions.length
  const score = Math.round((correct / total) * 100)
  const passed = score >= passingScore

  return { correct, total, score, passed, validAnswers }
}
