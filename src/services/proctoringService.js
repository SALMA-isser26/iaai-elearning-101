// src/services/proctoringService.js
import { supabase } from './supabaseClient'

// ─── Journaliser une violation (sortie d'onglet/fenêtre pendant un quiz) ─────

export async function logProctoringViolation(userId, quizId, moduleId, violationType) {
  const { error } = await supabase.from('quiz_proctoring_violations').insert({
    user_id: userId,
    quiz_id: quizId,
    module_id: moduleId,
    violation_type: violationType,
    user_agent: navigator.userAgent,
  })

  // Ne jamais bloquer l'invalidation du quiz si la journalisation échoue
  if (error) console.error('Erreur journalisation violation:', error)
}

// ─── Consulter le journal des violations (Admin) ─────────────────────────────

export async function getProctoringViolations({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('quiz_proctoring_violations')
    .select(`
      id, violation_type, created_at, user_agent,
      profiles:user_id (full_name, email),
      quizzes:quiz_id (title),
      modules:module_id (title)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ─── Nombre de violations par utilisateur (pour un badge sur AdminUsersPage) ──

export async function getViolationCountByUser(userId) {
  const { count, error } = await supabase
    .from('quiz_proctoring_violations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) return 0
  return count ?? 0
}
