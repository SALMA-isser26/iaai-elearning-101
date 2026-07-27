// src/constants/routes.js
// Toutes les routes du projet en un seul endroit.
export const ROUTES = {
  // Public
  HOME: '/',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Onboarding
  ONBOARDING_1: '/onboarding/step-1',
  ONBOARDING_2: '/onboarding/step-2',
  ONBOARDING_3: '/onboarding/step-3',

  // App
  DASHBOARD: '/dashboard',
  CATALOGUE: '/catalogue',
  CURRICULUM: '/curriculum',
  COURSE: (id) => `/course/${id}`,
  MODULE: (id) => `/module/${id}`,
  LESSON: (id) => `/lesson/${id}`,

  // Quiz
  QUIZ: (id) => `/quiz/${id}`,
  QUIZ_RESULT: (id) => `/quiz/result/${id}`,

  // Search
  SEARCH: '/search',

  // Certificates
  CERTIFICATES: '/certificates',
  CERTIFICATE_DETAIL: (id) => `/certificates/${id}`,

  // Community
  COMMUNITY: '/community',
  COMMUNITY_POST: (id) => `/community/post/${id}`,

  // Profile & Settings
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  BOOKMARKS: '/bookmarks',
  SETTINGS: '/settings',
  SUBSCRIPTION: '/subscription',
  UPGRADE: '/subscription',   // ← alias pour les liens "Passer à Premium"
  PAYMENT_SUCCESS: '/payment/success',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_COURSES: '/admin/courses',
  ADMIN_LESSONS: '/admin/lessons',
  ADMIN_QUIZZES: '/admin/quizzes',
  ADMIN_TESTIMONIALS: '/admin/testimonials',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_PROCTORING: '/admin/proctoring',
  ADMIN_FAQS: '/admin/faqs',
  ADMIN_SETTINGS: '/admin/settings',
}