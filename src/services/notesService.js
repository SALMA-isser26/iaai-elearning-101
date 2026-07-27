// src/services/notesService.js
// Service pour les notes personnelles de l'apprenant sur une leçon (table lesson_notes).
// À ne pas confondre avec `lesson.content_notes` (notes pédagogiques rédigées par
// l'équipe pour la leçon) : ici il s'agit des notes privées prises par l'utilisateur.
import { supabase } from './supabaseClient'

// ─── Récupérer la note de l'utilisateur pour une leçon ─────────────────────────
export async function getNote(userId, lessonId) {
  if (!userId || !lessonId) return { note: null }
  try {
    const { data, error } = await supabase
      .from('lesson_notes')
      .select('id, content, highlights, updated_at')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (error) throw error
    return { note: data }
  } catch (err) {
    console.error('[notesService] getNote:', err)
    return { note: null, error: 'Impossible de charger la note.' }
  }
}

// ─── Créer ou mettre à jour la note (upsert sur la contrainte user_id+lesson_id) ─
export async function saveNote(userId, lessonId, content) {
  if (!userId || !lessonId) return { error: 'Utilisateur ou leçon manquant.' }
  try {
    const { data, error } = await supabase
      .from('lesson_notes')
      .upsert(
        { user_id: userId, lesson_id: lessonId, content },
        { onConflict: 'user_id,lesson_id' }
      )
      .select('id, content, updated_at')
      .single()

    if (error) throw error
    return { note: data }
  } catch (err) {
    console.error('[notesService] saveNote:', err)
    return { error: 'Impossible d\'enregistrer la note.' }
  }
}

// ─── Supprimer la note ──────────────────────────────────────────────────────────
export async function deleteNote(userId, lessonId) {
  if (!userId || !lessonId) return { error: 'Utilisateur ou leçon manquant.' }
  try {
    const { error } = await supabase
      .from('lesson_notes')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[notesService] deleteNote:', err)
    return { error: 'Impossible de supprimer la note.' }
  }
}

// ─── Toutes les notes de l'utilisateur (pour une future page "Mes notes") ──────
export async function getAllUserNotes(userId) {
  if (!userId) return { notes: [] }
  try {
    const { data, error } = await supabase
      .from('lesson_notes')
      .select(`
        id, content, updated_at,
        lesson:lessons(id, title, module_id, modules(title))
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return { notes: data || [] }
  } catch (err) {
    console.error('[notesService] getAllUserNotes:', err)
    return { notes: [], error: 'Impossible de charger vos notes.' }
  }
}
