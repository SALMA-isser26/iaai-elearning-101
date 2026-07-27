// src/services/newsletterService.js
// Service pour gérer les abonnés à la newsletter

import { supabase } from './supabaseClient'

// ─── S'abonner à la newsletter ───────────────────────────────────────────
export async function subscribeToNewsletter(email, firstName = null, source = 'landing') {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email,
        first_name: firstName,
        status: 'active',
        source,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      })
      .select()
      .single()

    if (error) throw error
    return { subscriber: data }
  } catch (err) {
    console.error('[newsletterService] subscribeToNewsletter:', err)
    return { subscriber: null, error: 'Erreur lors de l\'inscription à la newsletter' }
  }
}

// ─── Récupérer tous les abonnés (admin) ─────────────────────────────────────
export async function getAllSubscribers() {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })

    if (error) throw error
    return { subscribers: data || [] }
  } catch (err) {
    console.error('[newsletterService] getAllSubscribers:', err)
    return { subscribers: [], error: 'Erreur lors de la récupération des abonnés' }
  }
}

// ─── Récupérer les abonnés actifs ───────────────────────────────────────────
export async function getActiveSubscribers() {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', 'active')
      .order('subscribed_at', { ascending: false })

    if (error) throw error
    return { subscribers: data || [] }
  } catch (err) {
    console.error('[newsletterService] getActiveSubscribers:', err)
    return { subscribers: [], error: 'Erreur lors de la récupération des abonnés actifs' }
  }
}

// ─── Désabonner un utilisateur ─────────────────────────────────────────────
export async function unsubscribeSubscriber(id) {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { subscriber: data }
  } catch (err) {
    console.error('[newsletterService] unsubscribeSubscriber:', err)
    return { subscriber: null, error: 'Erreur lors du désabonnement' }
  }
}

// ─── Réabonner un utilisateur ───────────────────────────────────────────────
export async function resubscribeSubscriber(id) {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        unsubscribed_at: null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { subscriber: data }
  } catch (err) {
    console.error('[newsletterService] resubscribeSubscriber:', err)
    return { subscriber: null, error: 'Erreur lors du réabonnement' }
  }
}

// ─── Supprimer un abonné (admin) ─────────────────────────────────────────────
export async function deleteSubscriber(id) {
  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('[newsletterService] deleteSubscriber:', err)
    return { success: false, error: 'Erreur lors de la suppression de l\'abonné' }
  }
}

// ─── Mettre à jour les métadonnées d'un abonné ───────────────────────────────
export async function updateSubscriberMetadata(id, metadata) {
  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({
        metadata,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { subscriber: data }
  } catch (err) {
    console.error('[newsletterService] updateSubscriberMetadata:', err)
    return { subscriber: null, error: 'Erreur lors de la mise à jour des métadonnées' }
  }
}

// ─── Compter le nombre d'abonnés ─────────────────────────────────────────────
export async function getSubscriberCount() {
  try {
    const { count, error } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) throw error
    return { count: count || 0 }
  } catch (err) {
    console.error('[newsletterService] getSubscriberCount:', err)
    return { count: 0, error: 'Erreur lors du comptage des abonnés' }
  }
}
