// src/lib/sentry.js
// Monitoring d'erreurs en production — IAAI eLearning 101
//
// Initialisation conditionnelle : Sentry ne démarre que si
// VITE_SENTRY_DSN est défini ET qu'on est en build de production.
// En dev / preview locale, aucun événement n'est envoyé (évite de polluer
// le dashboard Sentry avec des erreurs de développement).
//
// Le DSN Sentry n'est PAS un secret au sens strict (il est destiné à
// finir dans le bundle client, comme VITE_SUPABASE_ANON_KEY) — mais on le
// garde en variable d'env pour pouvoir le faire tourner ou le désactiver
// sans toucher au code.

import * as Sentry from '@sentry/react'

let initialized = false

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn || !import.meta.env.PROD) {
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Taux d'échantillonnage des traces de performance (10% suffit pour un
    // projet de cette taille, évite de consommer tout le quota gratuit).
    tracesSampleRate: 0.1,
    // Pas de session replay pour l'instant : coûteux en quota et pas
    // indispensable pour un premier monitoring d'erreurs.
    integrations: [],
    // Ignore les erreurs réseau transitoires classiques (offline, extensions
    // navigateur) qui ne sont pas actionnables côté code.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network Error',
      'Failed to fetch',
    ],
  })

  initialized = true
}

/**
 * Reporte une erreur à Sentry si initialisé, sinon ne fait rien
 * (safe à appeler même si initSentry() n'a jamais été déclenché,
 * ex: DSN absent en local).
 */
export function reportError(error, context) {
  if (!initialized) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}