import { supabase } from './supabaseClient'

// ─── Recherche avancée dans le contenu ───────────────────────────────────────────
export async function searchContent(query, filters = {}) {
  try {
    const { type, moduleId } = filters
    const searchQuery = query.toLowerCase()

    // Recherche dans les leçons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        *,
        module:modules(id, title, order_index)
      `)
      .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      .order('order_index')

    // Recherche dans les modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .ilike('title', `%${searchQuery}%`)
      .order('order_index')

    // Recherche dans les quiz
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select(`
        *,
        module:modules(id, title)
      `)
      .ilike('title', `%${searchQuery}%`)

    // Combiner et filtrer les résultats
    let results = []

    if (lessons && !lessonsError) {
      results = results.concat(
        lessons.map(lesson => ({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          description: lesson.content?.substring(0, 150) + '...',
          module: lesson.module?.title,
          moduleId: lesson.module_id,
          url: `/lesson/${lesson.id}`,
        }))
      )
    }

    if (modules && !modulesError) {
      results = results.concat(
        modules.map(module => ({
          type: 'module',
          id: module.id,
          title: module.title,
          description: module.description || '',
          module: module.title,
          moduleId: module.id,
          url: `/module/${module.id}`,
        }))
      )
    }

    if (quizzes && !quizzesError) {
      results = results.concat(
        quizzes.map(quiz => ({
          type: 'quiz',
          id: quiz.id,
          title: quiz.title,
          description: 'Quiz de connaissances',
          module: quiz.module?.title,
          moduleId: quiz.module_id,
          url: `/quiz/${quiz.id}`,
        }))
      )
    }

    // Appliquer les filtres
    if (type && type !== 'all') {
      results = results.filter(r => r.type === type)
    }

    if (moduleId) {
      results = results.filter(r => r.moduleId === moduleId)
    }

    return { results }
  } catch (err) {
    console.error('[searchService] searchContent:', err)
    return { error: 'Erreur lors de la recherche' }
  }
}

// ─── Suggestions de recherche ───────────────────────────────────────────────────
export async function getSearchSuggestions(query) {
  if (!query || query.length < 2) return { suggestions: [] }

  try {
    const searchQuery = query.toLowerCase()

    // Suggestions de leçons
    const { data: lessons } = await supabase
      .from('lessons')
      .select('title')
      .ilike('title', `%${searchQuery}%`)
      .limit(5)

    // Suggestions de modules
    const { data: modules } = await supabase
      .from('modules')
      .select('title')
      .ilike('title', `%${searchQuery}%`)
      .limit(5)

    const suggestions = [
      ...(lessons || []).map(l => ({ text: l.title, type: 'lesson' })),
      ...(modules || []).map(m => ({ text: m.title, type: 'module' })),
    ]

    return { suggestions }
  } catch (err) {
    console.error('[searchService] getSearchSuggestions:', err)
    return { suggestions: [] }
  }
}

// ─── Recherche par tags ────────────────────────────────────────────────────────
export async function searchByTag(tag) {
  try {
    // Recherche dans les leçons (si on ajoute des tags aux leçons)
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .contains('tags', [tag])

    // Recherche dans les posts de la communauté
    const { data: posts } = await supabase
      .from('community_posts')
      .select('*')
      .or(`title.ilike.%${tag}%,body.ilike.%${tag}%`)

    return {
      lessons: lessons || [],
      posts: posts || [],
    }
  } catch (err) {
    console.error('[searchService] searchByTag:', err)
    return { lessons: [], posts: [] }
  }
}