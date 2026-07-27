// src/services/bookmarkService.js
// Service pour gérer les favoris (bookmarks) des leçons

import { supabase } from './supabaseClient'

// ─── Récupérer tous les favoris d'un utilisateur ─────────────────────────
export async function getUserBookmarks(userId) {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        *,
        lessons (
          id,
          title,
          description,
          module_id,
          order_index,
          duration_minutes
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { bookmarks: data || [] }
  } catch (err) {
    console.error('[bookmarkService] getUserBookmarks:', err)
    return { bookmarks: [], error: 'Erreur lors de la récupération des favoris' }
  }
}

// ─── Vérifier si une leçon est en favori ─────────────────────────────────
export async function isLessonBookmarked(userId, lessonId) {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de résultat = pas de favori
        return { isBookmarked: false }
      }
      throw error
    }
    return { isBookmarked: true, bookmarkId: data.id }
  } catch (err) {
    console.error('[bookmarkService] isLessonBookmarked:', err)
    return { isBookmarked: false, error: 'Erreur lors de la vérification du favori' }
  }
}

// ─── Ajouter une leçon aux favoris ───────────────────────────────────────
export async function addBookmark(userId, lessonId) {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
      })
      .select()
      .single()

    if (error) throw error
    return { bookmark: data }
  } catch (err) {
    console.error('[bookmarkService] addBookmark:', err)
    return { bookmark: null, error: 'Erreur lors de l ajout aux favoris' }
  }
}

// ─── Supprimer une leçon des favoris ─────────────────────────────────────
export async function removeBookmark(userId, lessonId) {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[bookmarkService] removeBookmark:', err)
    return { success: false, error: 'Erreur lors de la suppression du favori' }
  }
}

// ─── Basculer le statut de favori (ajouter/supprimer) ───────────────────────
export async function toggleBookmark(userId, lessonId) {
  try {
    // D'abord vérifier si déjà en favori
    const { isBookmarked } = await isLessonBookmarked(userId, lessonId)

    if (isBookmarked) {
      return await removeBookmark(userId, lessonId)
    } else {
      return await addBookmark(userId, lessonId)
    }
  } catch (err) {
    console.error('[bookmarkService] toggleBookmark:', err)
    return { success: false, error: 'Erreur lors du basculement du favori' }
  }
}

// ─── Compter le nombre de favoris d'un utilisateur ────────────────────────
export async function getUserBookmarkCount(userId) {
  try {
    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) throw error
    return { count: count || 0 }
  } catch (err) {
    console.error('[bookmarkService] getUserBookmarkCount:', err)
    return { count: 0, error: 'Erreur lors du comptage des favoris' }
  }
}
