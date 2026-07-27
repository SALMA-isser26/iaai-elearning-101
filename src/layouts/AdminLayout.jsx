// src/layouts/AdminLayout.jsx
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { logout } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import logo from '@/assets/logo-iaai.png'

const navItems = [
  { label: "Vue d'ensemble", to: ROUTES.ADMIN, icon: 'dashboard', end: true },
  { label: 'Utilisateurs',   to: ROUTES.ADMIN_USERS, icon: 'group', end: false },
  { label: 'Cours',          to: ROUTES.ADMIN_COURSES, icon: 'menu_book', end: false },
  { label: 'Statistiques',   to: ROUTES.ADMIN_ANALYTICS, icon: 'bar_chart', end: false },
  { label: 'Intégrité',      to: ROUTES.ADMIN_PROCTORING, icon: 'shield', end: false },
  { label: 'Paramètres',     to: ROUTES.ADMIN_SETTINGS, icon: 'settings', end: false },
]

export default function AdminLayout() {
  const { user, logout: logoutStore } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = async () => {
    await logout()
    logoutStore()
    navigate(ROUTES.LOGIN)
  }

  function SidebarContent() {
    return (
      <>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="IAAI eLearning 101" className="h-9 w-auto object-contain" />
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            aria-label="Fermer le menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-purple-100 text-purple-700 font-semibold shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-1 border-t border-gray-100 pt-3">
          <button
            onClick={() => navigate(`${ROUTES.ADMIN_ANALYTICS}?export=1`)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download Reports
          </button>
          <button
            disabled
            title="Bientôt disponible"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
            Help Center
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-gray-300">Bientôt</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Déconnexion
          </button>

          {/* User card */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 mt-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0b1c30] truncate">{user?.fullName || 'Admin Sara'}</p>
              <p className="text-xs text-purple-500 font-semibold tracking-wide">
                {user?.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f5ff] flex">

      {/* ── Sidebar desktop (>= lg) ─────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full w-[230px] bg-white border-r border-gray-100 flex-col z-50 shadow-sm hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* ── Tiroir mobile (< lg) ───────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white
                    flex flex-col z-50 lg:hidden shadow-2xl
                    transition-opacity duration-200
                    ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ transform: menuOpen ? 'scale(1)' : 'scale(0.98)', transformOrigin: 'top left' }}
        aria-hidden={!menuOpen}
      >
        <SidebarContent />
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="lg:ml-[230px] flex-1 flex flex-col min-h-screen w-full">

        {/* Top header */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 h-14 flex items-center justify-between gap-3 px-4 md:px-8 z-40">

          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 w-80 transition-all focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100">
            <span className="material-symbols-outlined text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Rechercher un utilisateur, un cours..."
              className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/notifications')}
              title="Notifications"
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500 text-[20px]">notifications</span>
            </button>
            <button
              disabled
              title="Bientôt disponible"
              className="hidden sm:flex w-9 h-9 rounded-full bg-gray-50 border border-gray-200 items-center justify-center cursor-not-allowed opacity-50"
            >
              <span className="material-symbols-outlined text-gray-400 text-[20px]">help_outline</span>
            </button>
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-gray-100 ml-1">
              <div className="text-right">
                <p className="text-xs font-semibold text-[#0b1c30] leading-tight">{user?.fullName || 'Admin User'}</p>
                <p className="text-[11px] text-gray-400 leading-tight">Administrator</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
