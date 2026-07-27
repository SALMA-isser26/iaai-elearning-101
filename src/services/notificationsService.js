// src/services/notificationsService.js
// Service pour gérer les notifications admin

export const NOTIFICATION_TYPES = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_UPGRADED: 'USER_UPGRADED',
  USER_DELETED: 'USER_DELETED',
  CONTENT_PUBLISHED: 'CONTENT_PUBLISHED',
  CONTENT_DELETED: 'CONTENT_DELETED',
  QUIZ_COMPLETED: 'QUIZ_COMPLETED',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  TESTIMONIAL_PENDING: 'TESTIMONIAL_PENDING',
  ERROR_REPORTED: 'ERROR_REPORTED',
}

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.USER_REGISTERED]: 'person_add',
  [NOTIFICATION_TYPES.USER_UPGRADED]: 'workspace_premium',
  [NOTIFICATION_TYPES.USER_DELETED]: 'person_remove',
  [NOTIFICATION_TYPES.CONTENT_PUBLISHED]: 'publish',
  [NOTIFICATION_TYPES.CONTENT_DELETED]: 'delete',
  [NOTIFICATION_TYPES.QUIZ_COMPLETED]: 'quiz',
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'warning',
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'payments',
  [NOTIFICATION_TYPES.TESTIMONIAL_PENDING]: 'rate_review',
  [NOTIFICATION_TYPES.ERROR_REPORTED]: 'error',
}

export const NOTIFICATION_COLORS = {
  [NOTIFICATION_PRIORITIES.LOW]: 'bg-gray-100 text-gray-700 border-gray-200',
  [NOTIFICATION_PRIORITIES.MEDIUM]: 'bg-blue-100 text-blue-700 border-blue-200',
  [NOTIFICATION_PRIORITIES.HIGH]: 'bg-orange-100 text-orange-700 border-orange-200',
  [NOTIFICATION_PRIORITIES.URGENT]: 'bg-red-100 text-red-700 border-red-200',
}

/**
 * Crée une notification admin
 */
export async function createAdminNotification(notification) {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { data, error } = await supabase
    .from('admin_notifications')
    .insert({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || NOTIFICATION_PRIORITIES.MEDIUM,
      metadata: notification.metadata || {},
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[createAdminNotification]', error)
    return null
  }

  return data
}

/**
 * Récupère les notifications non lues pour l'admin
 */
export async function getUnreadNotifications(limit = 10) {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getUnreadNotifications]', error)
    return []
  }

  return data || []
}

/**
 * Récupère toutes les notifications
 */
export async function getAllNotifications(limit = 50) {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getAllNotifications]', error)
    return []
  }

  return data || []
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId) {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('[markNotificationAsRead]', error)
    return false
  }

  return true
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead() {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false)

  if (error) {
    console.error('[markAllNotificationsAsRead]', error)
    return false
  }

  return true
}

/**
 * Supprime une notification
 */
export async function deleteNotification(notificationId) {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { error } = await supabase
    .from('admin_notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('[deleteNotification]', error)
    return false
  }

  return true
}

/**
 * Compte les notifications non lues
 */
export async function getUnreadCount() {
  const { supabase } = await import('@/services/supabaseClient')
  
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (error) {
    console.error('[getUnreadCount]', error)
    return 0
  }

  return count || 0
}

/**
 * Helpers pour créer des notifications prédéfinies
 */
export const notificationHelpers = {
  userRegistered: (userName, userId) => ({
    type: NOTIFICATION_TYPES.USER_REGISTERED,
    title: 'Nouvel utilisateur inscrit',
    message: `${userName} vient de s'inscrire sur la plateforme`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    metadata: { user_id: userId, user_name: userName },
  }),

  userUpgraded: (userName, userId) => ({
    type: NOTIFICATION_TYPES.USER_UPGRADED,
    title: 'Utilisateur passé premium',
    message: `${userName} a souscrit à l'abonnement Illimité`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: { user_id: userId, user_name: userName },
  }),

  userDeleted: (userName, userId) => ({
    type: NOTIFICATION_TYPES.USER_DELETED,
    title: 'Utilisateur supprimé',
    message: `Le compte de ${userName} a été supprimé`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: { user_id: userId, user_name: userName },
  }),

  contentPublished: (contentType, contentTitle, contentId) => ({
    type: NOTIFICATION_TYPES.CONTENT_PUBLISHED,
    title: `Nouveau ${contentType} publié`,
    message: `${contentTitle} est maintenant disponible`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    metadata: { content_type: contentType, content_id: contentId, content_title: contentTitle },
  }),

  contentDeleted: (contentType, contentTitle) => ({
    type: NOTIFICATION_TYPES.CONTENT_DELETED,
    title: `${contentType} supprimé`,
    message: `${contentTitle} a été supprimé de la plateforme`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: { content_type: contentType, content_title: contentTitle },
  }),

  quizCompleted: (userName, quizTitle, score) => ({
    type: NOTIFICATION_TYPES.QUIZ_COMPLETED,
    title: 'Quiz complété',
    message: `${userName} a complété le quiz "${quizTitle}" avec un score de ${score}%`,
    priority: NOTIFICATION_PRIORITIES.LOW,
    metadata: { user_name: userName, quiz_title: quizTitle, score },
  }),

  systemAlert: (message, priority = NOTIFICATION_PRIORITIES.HIGH) => ({
    type: NOTIFICATION_TYPES.SYSTEM_ALERT,
    title: 'Alerte système',
    message,
    priority,
    metadata: {},
  }),

  paymentReceived: (userName, amount) => ({
    type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    title: 'Paiement reçu',
    message: `${userName} a effectué un paiement de ${amount}€`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: { user_name: userName, amount },
  }),

  testimonialPending: (userName) => ({
    type: NOTIFICATION_TYPES.TESTIMONIAL_PENDING,
    title: 'Témoignage en attente',
    message: `${userName} a soumis un témoignage qui nécessite une modération`,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    metadata: { user_name: userName },
  }),

  errorReported: (errorType, errorMessage) => ({
    type: NOTIFICATION_TYPES.ERROR_REPORTED,
    title: `Erreur: ${errorType}`,
    message: errorMessage,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    metadata: { error_type: errorType, error_message: errorMessage },
  }),
}
