// src/router/AppRouter.jsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
// NOTE: `PageTransition` (src/components/layout/PageTransition.jsx) existe mais n'est pas
// encore câblé ici — le faire proprement demande d'englober <Routes> dans <AnimatePresence>
// avec location.pathname comme clé. Prévu dans la passe de refonte visuelle.

// ─── Layouts (pas de lazy : chargés immédiatement) ───────────────────────────
import AdminLayout   from '@/layouts/AdminLayout'
import AppLayout     from '@/layouts/AppLayout'
import AuthLayout    from '@/layouts/AuthLayout'
import PublicLayout  from '@/layouts/PublicLayout'
import PrivateRoute  from '@/router/PrivateRoute'
import AdminRoute    from '@/router/AdminRoute'
import RequirePermission from '@/router/RequirePermission'
import { PERMISSIONS } from '@/services/permissionsService'

// ─── Lazy pages ───────────────────────────────────────────────────────────────
// Chaque page est chargée uniquement quand l'utilisateur la visite.
// → Résout le warning "chunk size > 500kb" de Vite.

const LandingPage        = lazy(() => import('@/pages/Landing/LandingPage'))

const LoginPage          = lazy(() => import('@/pages/Auth/LoginPage'))
const RegisterPage       = lazy(() => import('@/pages/Auth/RegisterPage'))
const VerifyEmailPage    = lazy(() => import('@/pages/Auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/Auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/Auth/ResetPasswordPage'))

const OnboardingPage     = lazy(() => import('@/pages/Onboarding/OnboardingPage'))

const DashboardPage      = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const CataloguePage      = lazy(() => import('@/pages/Catalogue/CataloguePage'))
const CurriculumPage     = lazy(() => import('@/pages/Learning/CurriculumPage'))
const ModulePage         = lazy(() => import('@/pages/Learning/ModulePage'))
const LessonPage         = lazy(() => import('@/pages/Learning/LessonPage'))
const QuizPage           = lazy(() => import('@/pages/Quiz/QuizPage'))
const QuizResultPage     = lazy(() => import('@/pages/Quiz/QuizResultPage'))
const CertificatesPage   = lazy(() => import('@/pages/Certificates/CertificatesPage'))
const VerifyCertificatePage = lazy(() => import('@/pages/Certificates/VerifyCertificatePage'))
const ProfilePage        = lazy(() => import('@/pages/Profile/ProfilePage'))
const BookmarksPage       = lazy(() => import('@/pages/Profile/BookmarksPage'))
const NotificationsPage  = lazy(() => import('@/pages/Notifications/NotificationsPage'))
const CommunautePage     = lazy(() => import('@/pages/Community/CommunautePage'))
const SettingsPage       = lazy(() => import('@/pages/Settings/SettingsPage'))
const UpgradePage        = lazy(() => import('@/pages/Settings/UpgradePage'))
const SearchPage         = lazy(() => import('@/pages/Search/SearchPage'))

const AdminHomePage      = lazy(() => import('@/pages/Admin/AdminHomePage'))
const AdminUsersPage     = lazy(() => import('@/pages/Admin/AdminUsersPage'))
const AdminCoursesPage   = lazy(() => import('@/pages/Admin/AdminCoursesPage'))
const AdminLessonsPage   = lazy(() => import('@/pages/Admin/AdminLessonsPage'))
const AdminQuizzesPage   = lazy(() => import('@/pages/Admin/AdminQuizzesPage'))
const AdminTestimonialsPage = lazy(() => import('@/pages/Admin/AdminTestimonialsPage'))
const AdminFAQsPage      = lazy(() => import('@/pages/Admin/AdminFAQsPage'))
const AdminAnalyticsPage = lazy(() => import('@/pages/Admin/AdminAnalyticsPage'))
const AdminProctoringPage = lazy(() => import('@/pages/Admin/AdminProctoringPage'))
const AdminSettingsPage  = lazy(() => import('@/pages/Admin/AdminSettingsPage'))

const PaymentSuccessPage = lazy(() => import('@/pages/Payment/PaymentSuccessPage'))
const NotFoundPage       = lazy(() => import('@/pages/NotFound/NotFoundPage'))

// ─── Fallback Suspense ────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#f8f5ff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl animate-pulse"
             style={{ background: 'linear-gradient(135deg, #ec4899, #8127cf)' }} />
        <p className="text-sm text-[#7e7385]">Chargement…</p>
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* PUBLIC */}
          <Route element={<PublicLayout />}>
            <Route path={ROUTES.HOME} element={<LandingPage />} />
          </Route>

          {/* PUBLIC — vérification de certificat (aucune authentification requise) */}
          <Route path="/verify/:certificateNumber" element={<VerifyCertificatePage />} />

          {/* AUTH */}
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN}            element={<LoginPage />} />
            <Route path={ROUTES.REGISTER}         element={<RegisterPage />} />
            <Route path={ROUTES.VERIFY_EMAIL}     element={<VerifyEmailPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD}  element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD}   element={<ResetPasswordPage />} />
          </Route>

          {/* ONBOARDING */}
          <Route element={<PrivateRoute />}>
            <Route path={ROUTES.ONBOARDING_1} element={<OnboardingPage />} />
            <Route path={ROUTES.ONBOARDING_2} element={<OnboardingPage />} />
            <Route path={ROUTES.ONBOARDING_3} element={<OnboardingPage />} />
          </Route>

          {/* APP */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.DASHBOARD}    element={<DashboardPage />} />
              <Route path={ROUTES.CATALOGUE}    element={<CataloguePage />} />
              <Route path={ROUTES.CURRICULUM}   element={<CurriculumPage />} />
              <Route path="/module/:id"          element={<ModulePage />} />
              <Route path="/lesson/:id"          element={<LessonPage />} />
              <Route path="/quiz/result/:id"     element={<QuizResultPage />} />
              <Route path="/quiz/:id"            element={<QuizPage />} />
              <Route path={ROUTES.CERTIFICATES} element={<CertificatesPage />} />
              <Route path={ROUTES.PROFILE}      element={<ProfilePage />} />
              <Route path={ROUTES.BOOKMARKS}    element={<BookmarksPage />} />
              <Route path="/notifications"       element={<NotificationsPage />} />
              <Route path={ROUTES.COMMUNITY}    element={<CommunautePage />} />
              <Route path={ROUTES.SETTINGS}     element={<SettingsPage />} />
              <Route path={ROUTES.SUBSCRIPTION} element={<UpgradePage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path={ROUTES.SEARCH}       element={<SearchPage />} />
            </Route>
          </Route>

          {/* ADMIN */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.ADMIN}         element={<AdminHomePage />} />
              <Route path={ROUTES.ADMIN_USERS}   element={
                <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
                  <AdminUsersPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_COURSES} element={
                <RequirePermission permission={PERMISSIONS.MODULES_VIEW}>
                  <AdminCoursesPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_LESSONS} element={
                <RequirePermission permission={PERMISSIONS.LESSONS_VIEW}>
                  <AdminLessonsPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_QUIZZES} element={
                <RequirePermission permission={PERMISSIONS.QUIZZES_VIEW}>
                  <AdminQuizzesPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_TESTIMONIALS} element={
                <RequirePermission permission={PERMISSIONS.TESTIMONIALS_VIEW}>
                  <AdminTestimonialsPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_FAQS}    element={
                <RequirePermission permission={PERMISSIONS.FAQS_VIEW}>
                  <AdminFAQsPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_ANALYTICS} element={
                <RequirePermission permission={PERMISSIONS.ANALYTICS_VIEW}>
                  <AdminAnalyticsPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_PROCTORING} element={
                <RequirePermission permission={PERMISSIONS.PROCTORING_VIEW}>
                  <AdminProctoringPage />
                </RequirePermission>
              } />
              <Route path={ROUTES.ADMIN_SETTINGS} element={
                <RequirePermission permission={PERMISSIONS.SETTINGS_VIEW}>
                  <AdminSettingsPage />
                </RequirePermission>
              } />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter