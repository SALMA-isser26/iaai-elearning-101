// src/services/quizScoring.test.js
import { describe, it, expect } from 'vitest'
import { calculateQuizScore } from './quizScoring'

// Jeu de questions réutilisé dans plusieurs tests : 4 questions à réponse unique
const questions = [
  { id: 'q1', answers: [{ id: 'q1-a', is_correct: true }, { id: 'q1-b', is_correct: false }] },
  { id: 'q2', answers: [{ id: 'q2-a', is_correct: false }, { id: 'q2-b', is_correct: true }] },
  { id: 'q3', answers: [{ id: 'q3-a', is_correct: true }, { id: 'q3-b', is_correct: false }] },
  { id: 'q4', answers: [{ id: 'q4-a', is_correct: false }, { id: 'q4-b', is_correct: true }] },
]

describe('calculateQuizScore', () => {
  it('calcule un score de 100% quand toutes les réponses sont correctes', () => {
    const answers = [
      { questionId: 'q1', answerId: 'q1-a' },
      { questionId: 'q2', answerId: 'q2-b' },
      { questionId: 'q3', answerId: 'q3-a' },
      { questionId: 'q4', answerId: 'q4-b' },
    ]
    const result = calculateQuizScore(questions, answers, 80)
    expect(result.correct).toBe(4)
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('calcule un score de 0% quand toutes les réponses sont fausses', () => {
    const answers = [
      { questionId: 'q1', answerId: 'q1-b' },
      { questionId: 'q2', answerId: 'q2-a' },
      { questionId: 'q3', answerId: 'q3-b' },
      { questionId: 'q4', answerId: 'q4-a' },
    ]
    const result = calculateQuizScore(questions, answers, 80)
    expect(result.correct).toBe(0)
    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('ignore les réponses null (question sautée à l\'expiration du timer) sans fausser le score', () => {
    // Régression : avant la correction, une réponse { answerId: null } pouvait
    // compter comme une comparaison malencontreuse dans le calcul.
    const answers = [
      { questionId: 'q1', answerId: 'q1-a' },   // correcte
      { questionId: 'q2', answerId: null },     // sautée — doit être ignorée
      { questionId: 'q3', answerId: 'q3-a' },   // correcte
      { questionId: 'q4', answerId: undefined },// sautée — doit être ignorée
    ]
    const result = calculateQuizScore(questions, answers, 50)
    expect(result.validAnswers).toHaveLength(2)
    expect(result.correct).toBe(2)
    // 2 bonnes réponses / 4 questions au total = 50%, pas 2/2 = 100%
    expect(result.score).toBe(50)
    expect(result.passed).toBe(true) // 50 >= 50
  })

  it('respecte le seuil de réussite (passingScore) configurable par quiz, pas 80 en dur', () => {
    const answers = [
      { questionId: 'q1', answerId: 'q1-a' },
      { questionId: 'q2', answerId: 'q2-b' },
      { questionId: 'q3', answerId: 'q3-b' }, // fausse
      { questionId: 'q4', answerId: 'q4-a' }, // fausse
    ]
    // 2/4 = 50%
    expect(calculateQuizScore(questions, answers, 60).passed).toBe(false)
    expect(calculateQuizScore(questions, answers, 50).passed).toBe(true)
  })

  it('lève une erreur explicite plutôt qu\'une division par zéro si le quiz n\'a aucune question', () => {
    expect(() => calculateQuizScore([], [], 80)).toThrow('Aucune question trouvée pour ce quiz.')
  })

  it('gère un tableau de réponses vide sans planter (quiz non commencé / timer expiré immédiatement)', () => {
    const result = calculateQuizScore(questions, [], 80)
    expect(result.correct).toBe(0)
    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('ignore une réponse dont le questionId ne correspond à aucune question du quiz', () => {
    const answers = [{ questionId: 'inconnu', answerId: 'x' }]
    const result = calculateQuizScore(questions, answers, 80)
    expect(result.correct).toBe(0)
    expect(result.score).toBe(0)
  })

  it('est exactement au seuil (score === passingScore) considéré comme réussi', () => {
    const answers = [
      { questionId: 'q1', answerId: 'q1-a' }, // correcte
      { questionId: 'q2', answerId: 'q2-a' }, // fausse
      { questionId: 'q3', answerId: 'q3-b' }, // fausse
      { questionId: 'q4', answerId: 'q4-a' }, // fausse
    ]
    // 1/4 = 25%
    const result = calculateQuizScore(questions, answers, 25)
    expect(result.score).toBe(25)
    expect(result.passed).toBe(true) // >= et non >
  })
})
