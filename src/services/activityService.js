import { supabase } from './supabaseClient'

// ─── Logger une activité utilisateur ───────────────────────────────────────────
export async function logActivity({
  userId,
  action,
  lessonId = null,
  moduleId = null,
  durationSeconds = 0,
  metadata = {},
}) {
  try {
    const { error } = await supabase.from('user_activity').insert({
      user_id: userId,
      action,
      lesson_id: lessonId,
      module_id: moduleId,
      duration_seconds: durationSeconds,
      metadata,
    })

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[activityService] logActivity:', err)
    return { error: 'Erreur lors du logging de l\'activité' }
  }
}

// ─── Hook pour tracker le temps passé sur une leçon ──────────────────────────
export function createLessonTimeTracker(userId, lessonId, moduleId) {
  let startTime = Date.now()
  let intervalId = null

  const startTracking = () => {
    startTime = Date.now()
    intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)

      // Envoyer les données toutes les 30 secondes
      if (elapsed % 30 === 0 && elapsed > 0) {
        logActivity({
          userId,
          action: 'lesson_time',
          lessonId,
          moduleId,
          durationSeconds: elapsed,
          metadata: { accumulated: true },
        })
      }
    }, 1000)
  }

  const stopTracking = async () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    const finalDuration = Math.floor((Date.now() - startTime) / 1000)

    // Logger la durée finale
    if (finalDuration > 0) {
      await logActivity({
        userId,
        action: 'lesson_view',
        lessonId,
        moduleId,
        durationSeconds: finalDuration,
        metadata: { final: true },
      })
    }

    return finalDuration
  }

  const getCurrentDuration = () => {
    return Math.floor((Date.now() - startTime) / 1000)
  }

  return {
    startTracking,
    stopTracking,
    getCurrentDuration,
  }
}
