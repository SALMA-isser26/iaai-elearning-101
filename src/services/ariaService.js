// src/services/ariaService.js
// Service React — appel à l'Edge Function ARIA (Gemini + pgvector)

import { supabase } from './supabaseClient'

// CORRECTION : l'URL ne doit pas contenir le project-ref en dur.
// On reconstruit l'URL depuis VITE_SUPABASE_URL déjà disponible dans l'env.
const ARIA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aria`

// ─── Récupérer l'historique de conversation d'un utilisateur ──────────────────
export async function getChatHistory(userId, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('question, answer, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Retourner l'historique dans l'ordre chronologique (plus ancien en premier)
    return { history: data.reverse() }
  } catch (err) {
    console.error('[ariaService] getChatHistory:', err)
    return { history: [] }
  }
}

// ─── Sauvegarder une conversation dans l'historique ───────────────────────────
export async function saveChatHistory({ userId, question, answer, lessonId = null, moduleId = null }) {
  try {
    const { error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        question,
        answer,
        lesson_id: lessonId,
        module_id: moduleId,
      })

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[ariaService] saveChatHistory:', err)
    return { error: 'Erreur lors de la sauvegarde de la conversation' }
  }
}

// ─── Suggestions de questions par module ───────────────────────────────────────
const SUGGESTIONS_BY_MODULE = {
  1: [
    "Qu'est-ce que l'intelligence artificielle ?",
    "Quelle est la différence entre IA et machine learning ?",
    "Comment fonctionne un réseau de neurones ?",
  ],
  2: [
    "Qu'est-ce que le machine learning supervisé ?",
    "Qu'est-ce que l'apprentissage non supervisé ?",
    "Comment évaluer un modèle de ML ?",
  ],
  3: [
    "Qu'est-ce que le deep learning ?",
    "Comment fonctionne un CNN ?",
    "Qu'est-ce qu'un RNN ?",
  ],
  default: [
    "Explique-moi les bases de l'IA",
    "Comment débuter en intelligence artificielle ?",
    "Quels sont les domaines d'application de l'IA ?",
  ],
}

export function getSuggestions(moduleId = null) {
  return SUGGESTIONS_BY_MODULE[moduleId] || SUGGESTIONS_BY_MODULE.default
}

// ─── Appeler ARIA avec une question ──────────────────────────────────────────
export async function askARIA({ question, lessonId = null, moduleId = null, history = [] }) {
  // Récupérer le token JWT de l'utilisateur connecté
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { error: 'Vous devez être connecté pour utiliser ARIA.' }
  }

  try {
    const response = await fetch(ARIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ question, lessonId, moduleId, history }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Erreur serveur ARIA' }
    }

    // Sauvegarder la conversation si succès
    if (session.user?.id) {
      await saveChatHistory({
        userId: session.user.id,
        question,
        answer: data.reponse,
        lessonId,
        moduleId,
      })
    }

    return {
      reponse:     data.reponse,
      sources:     data.sources     ?? [],
      chunksFound: data.chunksFound ?? 0,
    }

  } catch (err) {
    console.error('[ariaService]', err)
    return { error: 'Impossible de contacter ARIA. Vérifiez votre connexion.' }
  }
}