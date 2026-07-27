// src/router/AdminRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROLES } from '@/services/permissionsService'

// Rôles autorisés à accéder à l'interface d'administration
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN]

function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5ff]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Autoriser ADMIN et SUPER_ADMIN — les autres rôles (LEARNER, BLOCKED…) sont redirigés
  if (!ADMIN_ROLES.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute