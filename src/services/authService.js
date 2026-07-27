// src/services/authService.js
import { supabase } from '@/services/supabaseClient'

// ─── Inscription ─────────────────────────────────────────────────────────────
export async function register({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'LEARNER',
      },
    },
  })

  if (error) throw error
  return data
}

// ─── Connexion ────────────────────────────────────────────────────────────────
// Le verrouillage après échecs répétés est appliqué côté base (fonctions
// SECURITY DEFINER is_login_locked / record_login_attempt, voir la migration
// 20260716000003_add_login_lockout.sql) — pas seulement côté client, pour ne
// pas pouvoir être contourné en vidant le localStorage.
export async function login({ email, password }) {
  // 1. Vérifier si ce compte est actuellement verrouillé AVANT de tenter
  const { data: lockStatus, error: lockError } = await supabase.rpc('is_login_locked', {
    p_email: email,
  })

  // Si la vérification elle-même échoue (ex: migration pas encore appliquée
  // sur cet environnement), on ne bloque pas la connexion pour autant —
  // mieux vaut un verrou absent qu'un login cassé pour tout le monde.
  if (!lockError && lockStatus?.locked) {
    const err = new Error('Trop de tentatives. Réessayez plus tard.')
    err.code = 'ACCOUNT_LOCKED'
    err.retryAfterSeconds = lockStatus.retry_after_seconds
    throw err
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // 2. Enregistrer la tentative (succès ou échec) — best-effort, ne doit
  // jamais empêcher un login qui a par ailleurs réussi.
  try {
    await supabase.rpc('record_login_attempt', { p_email: email, p_success: !error })
  } catch (logErr) {
    console.error('[authService] échec de journalisation de la tentative:', logErr)
  }

  if (error) throw error
  return data
}

// ─── Déconnexion ─────────────────────────────────────────────────────────────
export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ─── Session actuelle ─────────────────────────────────────────────────────────
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// ─── Mot de passe oublié ──────────────────────────────────────────────────────
export async function forgotPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}