// src/services/certificateService.js
import { supabase } from './supabaseClient'

// ─── Vérifier si l'utilisateur mérite le certificat de fin de parcours ──────
// Un seul certificat par utilisateur, délivré quand TOUS les modules publiés
// sont complétés (leçons + quiz réussi). La logique vit côté base
// (check_certificate_eligibility, en lecture seule) pour rester alignée avec
// issue_certificate(), qui applique exactement la même règle au moment de
// l'émission.

export async function checkCertificateEligibility(userId) {
  const { data, error } = await supabase
    .rpc('check_certificate_eligibility')
    .single()

  if (error) {
    console.error('Erreur vérification éligibilité certificat:', error)
    return { eligible: false, bestScore: 0 }
  }

  return { eligible: data.eligible, bestScore: data.avg_score }
}

// ─── Générer (émettre) le certificat de fin de parcours ─────────────────────
// Passe par la fonction RPC `issue_certificate` (SECURITY DEFINER) : c'est
// elle qui vérifie l'éligibilité et insère la ligne — le client n'a plus le
// droit d'insérer directement dans `certificates` depuis la migration du 19/07.
// Idempotente : si un certificat existe déjà pour l'utilisateur, elle le
// retourne tel quel plutôt que d'en créer un second.

export async function generateCertificate(userId) {
  const { data, error } = await supabase
    .rpc('issue_certificate')
    .single()

  if (error) throw error
  return data
}

// ─── Tous les certificats d'un utilisateur ───────────────────────────────────

export async function getUserCertificates(userId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*, modules(title, order_index, level)')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })

  if (error) throw error
  return data || []
}

// ─── Vérification publique (page /verify/:certificateNumber) ────────────────
// Ne nécessite aucune authentification : passe par la fonction RPC
// `verify_certificate`, qui ne renvoie que les champs publics du certificat.

export async function verifyCertificatePublic(certificateNumber) {
  const { data, error } = await supabase
    .rpc('verify_certificate', { p_certificate_number: certificateNumber })
    .single()

  if (error) return null
  return data
}