// src/router/RequirePermission.jsx
// Composant de protection de route basé sur les permissions
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { hasPermission, hasAnyPermission } from '@/services/permissionsService'

function RequirePermission({ permission, permissions, fallback = '/dashboard', children }) {
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

  const userRole = user?.role

  // Vérifier une permission unique ou plusieurs permissions
  const hasAccess = permission
    ? hasPermission(userRole, permission)
    : hasAnyPermission(userRole, permissions || [])

  if (!hasAccess) {
    return <Navigate to={fallback} replace />
  }

  // Rendu des enfants — le composant est utilisé en wrapper JSX, pas en route nested
  return <>{children}</>
}

export default RequirePermission
