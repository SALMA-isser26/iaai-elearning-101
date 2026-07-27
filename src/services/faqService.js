// src/services/faqService.js
// Service pour gérer les FAQs

import { supabase } from './supabaseClient'

// ─── Récupérer toutes les FAQs publiées ─────────────────────────────────
export async function getPublishedFAQs() {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_published', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return { faqs: data || [] }
  } catch (err) {
    console.error('[faqService] getPublishedFAQs:', err)
    return { faqs: [], error: 'Erreur lors de la récupération des FAQs' }
  }
}

// ─── Récupérer toutes les FAQs (admin) ───────────────────────────────────
export async function getAllFAQs() {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) throw error
    return { faqs: data || [] }
  } catch (err) {
    console.error('[faqService] getAllFAQs:', err)
    return { faqs: [], error: 'Erreur lors de la récupération des FAQs' }
  }
}

// ─── Récupérer une FAQ par ID ─────────────────────────────────────────────
export async function getFAQById(id) {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return { faq: data }
  } catch (err) {
    console.error('[faqService] getFAQById:', err)
    return { faq: null, error: 'Erreur lors de la récupération de la FAQ' }
  }
}

// ─── Créer une nouvelle FAQ (admin) ───────────────────────────────────────
export async function createFAQ(faqData) {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .insert({
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category || 'général',
        order_index: faqData.order_index || 0,
        is_published: faqData.is_published !== undefined ? faqData.is_published : true,
      })
      .select()
      .single()

    if (error) throw error
    return { faq: data }
  } catch (err) {
    console.error('[faqService] createFAQ:', err)
    return { faq: null, error: 'Erreur lors de la création de la FAQ' }
  }
}

// ─── Mettre à jour une FAQ (admin) ────────────────────────────────────────
export async function updateFAQ(id, faqData) {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .update({
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
        order_index: faqData.order_index,
        is_published: faqData.is_published,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { faq: data }
  } catch (err) {
    console.error('[faqService] updateFAQ:', err)
    return { faq: null, error: 'Erreur lors de la mise à jour de la FAQ' }
  }
}

// ─── Supprimer une FAQ (admin) ────────────────────────────────────────────
export async function deleteFAQ(id) {
  try {
    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[faqService] deleteFAQ:', err)
    return { success: false, error: 'Erreur lors de la suppression de la FAQ' }
  }
}

// ─── Réordonner les FAQs (admin) ─────────────────────────────────────────
export async function reorderFAQs(faqs) {
  try {
    const updates = faqs.map((faq, index) => 
      supabase
        .from('faqs')
        .update({ order_index: index })
        .eq('id', faq.id)
    )

    await Promise.all(updates)
    return { success: true }
  } catch (err) {
    console.error('[faqService] reorderFAQs:', err)
    return { success: false, error: 'Erreur lors du réordonnancement des FAQs' }
  }
}
