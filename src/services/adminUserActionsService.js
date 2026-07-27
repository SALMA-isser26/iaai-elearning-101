// src/services/adminUserActionsService.js
// Ponts vers les Edge Functions admin-invite-user et admin-delete-user.
// Ces fonctions existaient déjà côté backend (avec les bonnes vérifications
// de rôle et de sécurité) mais n'étaient jamais appelées depuis le frontend :
// - la suppression d'utilisateur se faisait directement sur `profiles`
//   (ne supprimait jamais le compte auth.users réel)
// - le bouton "Inviter" n'avait aucun handler
//
// supabase.functions.invoke() attache automatiquement le token de la session
// admin en cours comme Authorization header — aucune manipulation manuelle
// du JWT n'est nécessaire ici.

import { supabase } from '@/services/supabaseClient'

/**
 * Invite un nouvel utilisateur par email (lien magique d'inscription).
 * @param {string} email
 * @returns {Promise<{ success: boolean, userId?: string }>}
 * @throws {Error} avec un message lisible si l'invitation échoue
 */
export async function inviteUser(email) {
  const { data, error } = await supabase.functions.invoke('admin-invite-user', {
    body: { email },
  })

  if (error) {
    // Le corps de la réponse (avec le message précis renvoyé par la fonction)
    // est disponible sur error.context pour les erreurs HTTP non-2xx.
    const serverMessage = await error.context?.json?.().catch(() => null)
    throw new Error(serverMessage?.error || error.message || "Échec de l'invitation.")
  }
  if (data?.error) throw new Error(data.error)

  return data
}

/**
 * Supprime un ou plusieurs utilisateurs (auth.users + profiles) via la
 * fonction sécurisée côté serveur (garde anti-auto-suppression et
 * anti-suppression-du-dernier-admin incluses).
 * @param {string[]} userIds
 * @returns {Promise<{ success: boolean, deleted: string[] }>}
 * @throws {Error} avec un message lisible si la suppression échoue
 */
export async function deleteUsers(userIds) {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userIds },
  })

  if (error) {
    const serverMessage = await error.context?.json?.().catch(() => null)
    throw new Error(serverMessage?.error || error.message || 'Échec de la suppression.')
  }
  if (data?.error) throw new Error(data.error)

  return data
}
