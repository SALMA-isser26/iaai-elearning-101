// src/layouts/AppLayout.jsx
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { logout } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import logo from '@/assets/logo-iaai.png'
import ARIAFloatingAssistant from '@/components/ui/ARIAFloatingAssistant'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'
import PageTransition from '@/components/layout/PageTransition'

export default function AppLayout() {
  const { t } = useTranslation()
  const { user, logout: logoutStore } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchInput, setSearchInput] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  // navItems recalculé à chaque render → se retraduit au changement de langue
  const navItems = [
    { label: t('nav.dashboard'),    to: ROUTES.DASHBOARD,    icon: 'dashboard' },
    { label: t('nav.catalogue'),    to: ROUTES.CATALOGUE,    icon: 'grid_view' },
    { label: t('nav.curriculum'),   to: ROUTES.CURRICULUM,   icon: 'school' },
    { label: t('nav.certificates'), to: ROUTES.CERTIFICATES, icon: 'workspace_premium' },
    { label: t('nav.community'),    to: ROUTES.COMMUNITY,    icon: 'groups' },
    { label: t('nav.settings'),     to: ROUTES.SETTINGS,     icon: 'settings' },
  ]

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const planLabel = user?.plan === 'premium' ? t('common.unlimited_plan') : t('common.free_plan')
  const isPremium = user?.plan === 'premium'

  // Ferme le tiroir mobile automatiquement à chaque changement de page
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Empêche le scroll du body pendant que le tiroir mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = async () => {
    await logout()
    logoutStore()
    navigate(ROUTES.LOGIN)
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  const handleSearchClick = () => {
    if (searchInput.trim()) {
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchInput.trim())}`)
    } else {
      navigate(ROUTES.SEARCH)
    }
  }

  // ── Contenu de la navigation, partagé entre la sidebar desktop et le tiroir mobile ──
  function SidebarContent() {
    return (
      <>
        {/* Logo + bouton fermeture mobile */}
        <div className="px-6 py-4 mb-4 flex items-center justify-between">
          <NavLink to={ROUTES.DASHBOARD} className="hover:opacity-80 transition-opacity">
            <img src={logo} alt="IAAI eLearning 101" className="h-12 w-auto object-contain" />
          </NavLink>
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center
                       transition-all duration-200 hover:scale-110"
            style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-hover)' }}
            aria-label={t('common.close')}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                 transition-all duration-150 ${
                  isActive
                    ? 'font-bold border-e-[3px]'
                    : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'var(--color-bg-hover)',
                color: 'var(--color-primary)',
                borderRightColor: 'var(--color-primary)',
              } : {
                color: 'var(--color-text-muted)',
              }}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bas de sidebar : profil + upgrade + actions */}
        <div className="px-4 mt-auto mb-2 space-y-1">

          {/* Carte profil */}
          <div
            className="rounded-xl p-4 mb-2 border"
            style={{
              background: 'var(--color-bg-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center
                           font-bold text-sm text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: 'var(--color-text)' }}
                >
                  {user?.fullName || 'Utilisateur'}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: isPremium ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                >
                  {isPremium ? ' ' : ''}{planLabel}
                </p>
              </div>
            </div>

            {!isPremium && (
              <button
                onClick={() => navigate(ROUTES.UPGRADE)}
                className="w-full py-2.5 rounded-full text-white text-xs font-bold
                           flex items-center justify-center gap-2
                           transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)' }}
              >
                {t('nav.upgrade')}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>

          {/* Lien profil */}
          <NavLink
            to={ROUTES.PROFILE}
            className="flex items-center gap-3 px-2 py-2.5 text-sm rounded-xl
                       transition-colors duration-150 hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
            {t('nav.profile')}
          </NavLink>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-2 py-2.5 text-sm w-full rounded-xl
                       transition-colors duration-150 hover:text-red-500"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            {t('nav.logout')}
          </button>
        </div>
      </>
    )
  }

  return (
    <div
      className="min-h-screen flex theme-transition"
      style={{ background: 'var(--color-bg)' }}
    >

      {/* ── Sidebar desktop (>= lg) ─────────────────────────────────────────── */}
      <aside
        className="fixed start-0 top-0 h-full w-64 flex flex-col py-2 z-50 hidden lg:flex
                   border-e theme-transition"
        style={{
          background: 'var(--color-bg-sidebar)',
          borderColor: 'var(--color-border)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Tiroir mobile (< lg) ───────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed start-0 top-0 h-full w-72 max-w-[85vw]
                    flex flex-col py-2 z-50 lg:hidden shadow-2xl border-e
                    transition-all duration-300 ease-out theme-transition
                    ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
        style={{
          background: 'var(--color-bg-sidebar)',
          borderColor: 'var(--color-border)',
        }}
        aria-hidden={!menuOpen}
      >
        <SidebarContent />
      </aside>

      {/* ── Contenu principal ────────────────────────────────────────────────── */}
      <div className="lg:ms-64 flex-1 flex flex-col w-full">

        {/* ── Topbar ── */}
        <header
          className="fixed top-0 start-0 lg:start-64 end-0 h-16
                     flex items-center justify-between gap-3 px-4 md:px-8 z-40
                     border-b backdrop-blur-md theme-transition"
          style={{
            background: 'var(--color-bg-header)',
            borderColor: 'var(--color-border)',
          }}
        >

          {/* Bouton menu mobile */}
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center
                       transition-all duration-200 hover:scale-110"
            style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-card)' }}
            aria-label={t('nav.open_menu')}
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          {/* Barre de recherche */}
          <div
            className="flex items-center px-4 py-2 rounded-full w-full max-w-80
                       gap-2 cursor-text transition-all duration-200 border
                       focus-within:shadow-md"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={handleSearchClick}
              className="flex-shrink-0 transition-colors duration-150 hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={t('common.search')}
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={t('nav.search')}
              className="bg-transparent border-none focus:outline-none text-sm w-full"
              style={{ color: 'var(--color-text)' }}
            />
          </div>

          {/* Actions topbar */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">

            {/* Switcher de langue */}
            <span className="hidden sm:block">
              <LanguageSwitcher variant="pill" />
            </span>

            {/* Toggle thème — l'essentiel ! */}
            <ThemeToggle variant="icon" />

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="w-10 h-10 rounded-full flex items-center justify-center
                         transition-all duration-200 hover:scale-110"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-card)' }}
              aria-label={t('nav.notifications')}
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>

            {/* Avatar profil */}
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              className="w-10 h-10 rounded-full flex items-center justify-center
                         text-white font-bold text-sm border-2
                         transition-all duration-200 hover:scale-110
                         hover:shadow-lg flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)',
                borderColor: 'var(--color-border)',
                boxShadow: '0 0 0 0 rgba(129, 39, 207, 0)',
              }}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="mt-16 p-4 md:p-8 flex-1 w-full overflow-x-hidden">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <ARIAFloatingAssistant />

    </div>
  )
}
