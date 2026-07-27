// src/services/permissionsService.js
// Service pour gérer les permissions et rôles avec granularité

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  EDITOR: 'EDITOR',
  LEARNER: 'LEARNER',
  BLOCKED: 'BLOCKED',
}

export const PERMISSIONS = {
  // Utilisateurs
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_CHANGE_ROLE: 'users:change_role',
  USERS_VIEW_PROGRESS: 'users:view_progress',
  
  // Contenu - Modules
  MODULES_VIEW: 'modules:view',
  MODULES_CREATE: 'modules:create',
  MODULES_EDIT: 'modules:edit',
  MODULES_DELETE: 'modules:delete',
  MODULES_PUBLISH: 'modules:publish',
  
  // Contenu - Leçons
  LESSONS_VIEW: 'lessons:view',
  LESSONS_CREATE: 'lessons:create',
  LESSONS_EDIT: 'lessons:edit',
  LESSONS_DELETE: 'lessons:delete',
  LESSONS_PUBLISH: 'lessons:publish',
  
  // Contenu - Quiz
  QUIZZES_VIEW: 'quizzes:view',
  QUIZZES_CREATE: 'quizzes:create',
  QUIZZES_EDIT: 'quizzes:edit',
  QUIZZES_DELETE: 'quizzes:delete',
  QUIZZES_PUBLISH: 'quizzes:publish',
  QUIZZES_VIEW_RESULTS: 'quizzes:view_results',
  
  // Contenu - FAQs
  FAQS_VIEW: 'faqs:view',
  FAQS_CREATE: 'faqs:create',
  FAQS_EDIT: 'faqs:edit',
  FAQS_DELETE: 'faqs:delete',
  FAQS_PUBLISH: 'faqs:publish',
  
  // Témoignages
  TESTIMONIALS_VIEW: 'testimonials:view',
  TESTIMONIALS_MODERATE: 'testimonials:moderate',
  TESTIMONIALS_DELETE: 'testimonials:delete',
  TESTIMONIALS_FEATURE: 'testimonials:feature',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',

  // Intégrité / anti-triche
  PROCTORING_VIEW: 'proctoring:view',
  
  // Paramètres
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_MANAGE_PAYMENT: 'settings:manage_payment',
  SETTINGS_MANAGE_EMAIL: 'settings:manage_email',
  SETTINGS_MANAGE_SECURITY: 'settings:manage_security',
  
  // Communauté
  COMMUNITY_VIEW: 'community:view',
  COMMUNITY_MODERATE: 'community:moderate',
  COMMUNITY_DELETE: 'community:delete',
}

// Définition des permissions par rôle
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // Super admin a TOUTES les permissions
    ...Object.values(PERMISSIONS),
  ],
  
  [ROLES.ADMIN]: [
    // Admin peut gérer tout sauf les paramètres critiques
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_CHANGE_ROLE,
    PERMISSIONS.USERS_VIEW_PROGRESS,
    PERMISSIONS.MODULES_VIEW,
    PERMISSIONS.MODULES_CREATE,
    PERMISSIONS.MODULES_EDIT,
    PERMISSIONS.MODULES_DELETE,
    PERMISSIONS.MODULES_PUBLISH,
    PERMISSIONS.LESSONS_VIEW,
    PERMISSIONS.LESSONS_CREATE,
    PERMISSIONS.LESSONS_EDIT,
    PERMISSIONS.LESSONS_DELETE,
    PERMISSIONS.LESSONS_PUBLISH,
    PERMISSIONS.QUIZZES_VIEW,
    PERMISSIONS.QUIZZES_CREATE,
    PERMISSIONS.QUIZZES_EDIT,
    PERMISSIONS.QUIZZES_DELETE,
    PERMISSIONS.QUIZZES_PUBLISH,
    PERMISSIONS.QUIZZES_VIEW_RESULTS,
    PERMISSIONS.FAQS_VIEW,
    PERMISSIONS.FAQS_CREATE,
    PERMISSIONS.FAQS_EDIT,
    PERMISSIONS.FAQS_DELETE,
    PERMISSIONS.FAQS_PUBLISH,
    PERMISSIONS.TESTIMONIALS_VIEW,
    PERMISSIONS.TESTIMONIALS_MODERATE,
    PERMISSIONS.TESTIMONIALS_DELETE,
    PERMISSIONS.TESTIMONIALS_FEATURE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.PROCTORING_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.COMMUNITY_VIEW,
    PERMISSIONS.COMMUNITY_MODERATE,
    PERMISSIONS.COMMUNITY_DELETE,
  ],
  
  [ROLES.MODERATOR]: [
    // Modérateur peut modérer le contenu
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_VIEW_PROGRESS,
    PERMISSIONS.MODULES_VIEW,
    PERMISSIONS.LESSONS_VIEW,
    PERMISSIONS.QUIZZES_VIEW,
    PERMISSIONS.QUIZZES_VIEW_RESULTS,
    PERMISSIONS.PROCTORING_VIEW,
    PERMISSIONS.FAQS_VIEW,
    PERMISSIONS.FAQS_EDIT,
    PERMISSIONS.FAQS_PUBLISH,
    PERMISSIONS.TESTIMONIALS_VIEW,
    PERMISSIONS.TESTIMONIALS_MODERATE,
    PERMISSIONS.TESTIMONIALS_FEATURE,
    PERMISSIONS.COMMUNITY_VIEW,
    PERMISSIONS.COMMUNITY_MODERATE,
  ],
  
  [ROLES.EDITOR]: [
    // Éditeur peut gérer le contenu pédagogique
    PERMISSIONS.MODULES_VIEW,
    PERMISSIONS.MODULES_CREATE,
    PERMISSIONS.MODULES_EDIT,
    PERMISSIONS.MODULES_PUBLISH,
    PERMISSIONS.LESSONS_VIEW,
    PERMISSIONS.LESSONS_CREATE,
    PERMISSIONS.LESSONS_EDIT,
    PERMISSIONS.LESSONS_PUBLISH,
    PERMISSIONS.QUIZZES_VIEW,
    PERMISSIONS.QUIZZES_CREATE,
    PERMISSIONS.QUIZZES_EDIT,
    PERMISSIONS.QUIZZES_PUBLISH,
    PERMISSIONS.FAQS_VIEW,
    PERMISSIONS.FAQS_CREATE,
    PERMISSIONS.FAQS_EDIT,
  ],
  
  [ROLES.LEARNER]: [
    // Apprenant standard a accès au contenu
    PERMISSIONS.MODULES_VIEW,
    PERMISSIONS.LESSONS_VIEW,
    PERMISSIONS.QUIZZES_VIEW,
    PERMISSIONS.FAQS_VIEW,
    PERMISSIONS.COMMUNITY_VIEW,
  ],
  
  [ROLES.BLOCKED]: [
    // Utilisateur bloqué n'a aucune permission
  ],
}

// Labels d'affichage pour les rôles
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.MODERATOR]: 'Modérateur',
  [ROLES.EDITOR]: 'Éditeur',
  [ROLES.LEARNER]: 'Apprenant',
  [ROLES.BLOCKED]: 'Bloqué',
}

// Couleurs pour les badges de rôle
export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'bg-red-100 text-red-700 border-red-200',
  [ROLES.ADMIN]: 'bg-violet-100 text-violet-700 border-violet-200',
  [ROLES.MODERATOR]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ROLES.EDITOR]: 'bg-green-100 text-green-700 border-green-200',
  [ROLES.LEARNER]: 'bg-gray-100 text-gray-700 border-gray-200',
  [ROLES.BLOCKED]: 'bg-red-50 text-red-600 border-red-200',
}

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false
  
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}

/**
 * Vérifie si un rôle a AU MOINS UNE des permissions spécifiées
 */
export function hasAnyPermission(role, permissions) {
  if (!role || !permissions || !Array.isArray(permissions)) return false
  
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Vérifie si un rôle a TOUTES les permissions spécifiées
 */
export function hasAllPermissions(role, permissions) {
  if (!role || !permissions || !Array.isArray(permissions)) return false
  
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Obtient toutes les permissions d'un rôle
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Obtient les rôles qu'un utilisateur peut assigner
 * (un admin ne peut pas assigner super admin, etc.)
 */
export function getAssignableRoles(currentRole) {
  switch (currentRole) {
    case ROLES.SUPER_ADMIN:
      return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR, ROLES.EDITOR, ROLES.LEARNER, ROLES.BLOCKED]
    case ROLES.ADMIN:
      return [ROLES.ADMIN, ROLES.MODERATOR, ROLES.EDITOR, ROLES.LEARNER, ROLES.BLOCKED]
    case ROLES.MODERATOR:
      return [ROLES.LEARNER, ROLES.BLOCKED]
    default:
      return []
  }
}

/**
 * Hook React pour vérifier les permissions
 */
export function usePermissions(role) {
  return {
    hasPermission: (permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(role, permissions),
    hasAllPermissions: (permissions) => hasAllPermissions(role, permissions),
    can: (permission) => hasPermission(role, permission),
    permissions: getRolePermissions(role),
  }
}
