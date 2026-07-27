// src/services/courseService.js
import { supabase } from './supabaseClient'

// ─── Modules ──────────────────────────────────────────────────────────────────

export async function getAllModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

// ─── Modules publiés uniquement (pages publiques) ─────────────────────────────
// Exclut les brouillons (is_published = false) pour les apprenants.
// Utiliser getAllModules() dans les pages admin qui doivent voir tous les modules.
export async function getPublishedModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}


// ─── Modules avec statistiques (Admin) ────────────────────────────────────────
// Combine la liste des modules avec les compteurs (leçons/quiz/apprenants)
// calculés côté SQL via la fonction RPC get_admin_module_stats, au lieu de
// charger toutes les lignes de lessons/quizzes/user_progress côté client.
export async function getAllModulesWithStats() {
  const [{ data: modules, error: modulesError }, { data: stats, error: statsError }] = await Promise.all([
    supabase
      .from('modules')
      .select('id, title, description, order_index, is_premium, is_published, created_at')
      .order('order_index', { ascending: true }),
    supabase.rpc('get_admin_module_stats'),
  ])

  if (modulesError) throw modulesError
  if (statsError) throw statsError

  const statsByModule = {}
  ;(stats || []).forEach(s => {
    statsByModule[s.module_id] = {
      lessons: Number(s.lessons_count) || 0,
      quizzes: Number(s.quizzes_count) || 0,
      enrolled: Number(s.enrolled_count) || 0,
    }
  })

  return (modules || []).map(mod => ({
    ...mod,
    lessons: statsByModule[mod.id]?.lessons || 0,
    quizzes: statsByModule[mod.id]?.quizzes || 0,
    enrolled: statsByModule[mod.id]?.enrolled || 0,
  }))
}

export async function getModuleById(moduleId) {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single()

  if (error) throw error
  return data
}

// ─── CRUD Modules (Admin) ─────────────────────────────────────────────────────

export async function createModule(moduleData) {
  const { data, error } = await supabase
    .from('modules')
    .insert({
      title: moduleData.title,
      description: moduleData.description || null,
      order_index: moduleData.order_index,
      is_premium: moduleData.is_premium !== undefined ? moduleData.is_premium : false,
      is_published: moduleData.is_published !== undefined ? moduleData.is_published : false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateModule(moduleId, moduleData) {
  const { data, error } = await supabase
    .from('modules')
    .update({
      title: moduleData.title,
      description: moduleData.description,
      order_index: moduleData.order_index,
      is_premium: moduleData.is_premium,
      is_published: moduleData.is_published,
    })
    .eq('id', moduleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteModule(moduleId) {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId)

  if (error) throw error
  return true
}

// ─── Leçons ───────────────────────────────────────────────────────────────────

export async function getLessonsByModule(moduleId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

export async function getLessonById(lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*, modules(title)')
    .eq('id', lessonId)
    .single()

  if (error) throw error
  return data
}

// ─── CRUD Leçons (Admin) ─────────────────────────────────────────────────────

export async function createLesson(lessonData) {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      module_id: lessonData.module_id,
      title: lessonData.title,
      description: lessonData.description,
      content: lessonData.content || null,
      video_url: lessonData.video_url || null,
      duration_minutes: lessonData.duration_minutes || null,
      order_index: lessonData.order_index || 0,
      is_premium: lessonData.is_premium !== undefined ? lessonData.is_premium : true,
      is_published: lessonData.is_published !== undefined ? lessonData.is_published : false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLesson(lessonId, lessonData) {
  const { data, error } = await supabase
    .from('lessons')
    .update({
      module_id: lessonData.module_id,
      title: lessonData.title,
      description: lessonData.description,
      content: lessonData.content,
      video_url: lessonData.video_url,
      duration_minutes: lessonData.duration_minutes,
      order_index: lessonData.order_index,
      is_premium: lessonData.is_premium,
      is_published: lessonData.is_published,
    })
    .eq('id', lessonId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) throw error
  return true
}

export async function getAllLessons() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*, modules(title)')
    .order('module_id', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

// ─── SUPPRIMÉ : getCurriculumWithProgress ─────────────────────────────────────
// Cette fonction faisait un LEFT JOIN sur user_progress sans filtre user_id
// côté Supabase, exposant les progressions de tous les utilisateurs dans la
// réponse JSON (le filtre JS côté client arrivait trop tard).
//
// Remplacée par 3 requêtes séparées directement dans CurriculumPage.jsx :
//   1. supabase.from('modules').select('*')
//   2. supabase.from('lessons').select('*')
//   3. supabase.from('user_progress').select(...).eq('user_id', userId)
//
// Cette approche est plus sûre (RLS s'applique correctement sur chaque requête)
// et plus lisible.