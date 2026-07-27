// src/services/testimonialService.js
// Service pour gérer les témoignages

import { supabase } from './supabaseClient'

// ─── Récupérer les témoignages publiés ───────────────────────────────────
export async function getPublishedTestimonials(limit = null) {
  try {
    let query = supabase
      .from('testimonials')
      .select('*')
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return { testimonials: data || [] }
  } catch (err) {
    console.error('[testimonialService] getPublishedTestimonials:', err)
    return { testimonials: [], error: 'Erreur lors de la récupération des témoignages' }
  }
}

// ─── Récupérer les témoignages en vedette ────────────────────────────────
export async function getFeaturedTestimonials(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { testimonials: data || [] }
  } catch (err) {
    console.error('[testimonialService] getFeaturedTestimonials:', err)
    return { testimonials: [], error: 'Erreur lors de la récupération des témoignages' }
  }
}

// ─── Récupérer tous les témoignages (admin) ───────────────────────────────
export async function getAllTestimonials() {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { testimonials: data || [] }
  } catch (err) {
    console.error('[testimonialService] getAllTestimonials:', err)
    return { testimonials: [], error: 'Erreur lors de la récupération des témoignages' }
  }
}

// ─── Récupérer un témoignage par ID ───────────────────────────────────────
export async function getTestimonialById(id) {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return { testimonial: data }
  } catch (err) {
    console.error('[testimonialService] getTestimonialById:', err)
    return { testimonial: null, error: 'Erreur lors de la récupération du témoignage' }
  }
}

// ─── Créer un nouveau témoignage ─────────────────────────────────────────
export async function createTestimonial(testimonialData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        user_id: user?.id || null,
        full_name: testimonialData.full_name,
        role: testimonialData.role || 'Apprenant',
        avatar_url: testimonialData.avatar_url || null,
        content: testimonialData.content,
        rating: testimonialData.rating || 5,
        is_published: false, // Par défaut, non publié
        is_featured: false,
      })
      .select()
      .single()

    if (error) throw error
    return { testimonial: data }
  } catch (err) {
    console.error('[testimonialService] createTestimonial:', err)
    return { testimonial: null, error: 'Erreur lors de la création du témoignage' }
  }
}

// ─── Mettre à jour un témoignage (admin) ──────────────────────────────────
export async function updateTestimonial(id, testimonialData) {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .update({
        full_name: testimonialData.full_name,
        role: testimonialData.role,
        avatar_url: testimonialData.avatar_url,
        content: testimonialData.content,
        rating: testimonialData.rating,
        is_published: testimonialData.is_published,
        is_featured: testimonialData.is_featured,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { testimonial: data }
  } catch (err) {
    console.error('[testimonialService] updateTestimonial:', err)
    return { testimonial: null, error: 'Erreur lors de la mise à jour du témoignage' }
  }
}

// ─── Supprimer un témoignage (admin) ───────────────────────────────────────
export async function deleteTestimonial(id) {
  try {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[testimonialService] deleteTestimonial:', err)
    return { success: false, error: 'Erreur lors de la suppression du témoignage' }
  }
}

// ─── Approuver un témoignage (admin) ───────────────────────────────────────
export async function approveTestimonial(id) {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .update({ is_published: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { testimonial: data }
  } catch (err) {
    console.error('[testimonialService] approveTestimonial:', err)
    return { testimonial: null, error: 'Erreur lors de l approbation du témoignage' }
  }
}

// ─── Rejeter un témoignage (admin) ─────────────────────────────────────────
export async function rejectTestimonial(id) {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .update({ is_published: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { testimonial: data }
  } catch (err) {
    console.error('[testimonialService] rejectTestimonial:', err)
    return { testimonial: null, error: 'Erreur lors du rejet du témoignage' }
  }
}
