// src/services/auditLogService.js
// Journalisation des actions admin sensibles (table admin_audit_log).
//
// Les actions qui passent par une Edge Function (suppression/invitation
// d'utilisateur) sont journalisées côté serveur, dans la fonction elle-même
// — voir supabase/functions/admin-delete-user et admin-invite-user — car
// c'est la source de vérité et ça ne peut pas être contourné côté client.
//
// Ce service couvre les actions qui, elles, se font directement depuis React
// vers Supabase sans passer par une Edge Function (ex: sauvegarde des
// paramètres système).
//
// Volontairement non-bloquant : si la journalisation échoue, on logue
// l'erreur en console mais on ne fait jamais échouer l'action métier
// elle-même à cause d'un souci de log.
import { supabase } from './supabaseClient'

/**
 * @param {string} action      ex: 'settings.update'
 * @param {object} [options]
 * @param {string} [options.targetType]
 * @param {string} [options.targetId]
 * @param {object} [options.details]
 */
export async function logAdminAction(action, { targetType, targetId, details } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id:    user.id,
      admin_email: user.email,
      action,
      target_type: targetType ?? null,
      target_id:   targetId ?? null,
      details:     details ?? {},
    })

    if (error) console.error('[auditLogService] échec de journalisation:', error)
  } catch (err) {
    console.error('[auditLogService] échec de journalisation:', err)
  }
}

/**
 * Récupère les dernières entrées du journal (pour une future page
 * "Journal d'activité admin").
 */
export async function getAuditLog(limit = 100) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
