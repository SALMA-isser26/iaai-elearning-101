import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/hooks/useLanguage'
import logo from '@/assets/logo-iaai.png'
import ThemeToggle from '@/components/ui/ThemeToggle'

// ── Sélecteur de langue FR / AR ─────────────────────────────────────────────
function LanguageToggle() {
  const { language, switchLanguage } = useLanguage()

  return (
    <div
      className="flex items-center rounded-full border p-0.5 text-xs font-bold"
      style={{ borderColor: 'var(--color-border)' }}
      role="group"
      aria-label="Choix de la langue"
    >
      <button
        type="button"
        onClick={() => switchLanguage('fr')}
        aria-pressed={language === 'fr'}
        className="rounded-full px-2.5 py-1 transition-colors"
        style={
          language === 'fr'
            ? { background: 'var(--color-primary)', color: '#fff' }
            : { color: 'var(--color-text-muted)' }
        }
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => switchLanguage('ar')}
        aria-pressed={language === 'ar'}
        className="rounded-full px-2.5 py-1 transition-colors"
        style={
          language === 'ar'
            ? { background: 'var(--color-primary)', color: '#fff' }
            : { color: 'var(--color-text-muted)' }
        }
      >
        AR
      </button>
    </div>
  )
}

function PublicLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen theme-transition" style={{ background: 'var(--color-bg)' }}>

      {/* ── Topbar ── */}
      <header
        className="fixed top-0 z-50 w-full border-b backdrop-blur-xl shadow-sm theme-transition"
        style={{
          background: 'var(--color-bg-header)',
          borderColor: 'var(--color-border)',
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link to={ROUTES.HOME}>
            <img src={logo} alt="IAAI eLearning 101" className="h-14 object-contain" />
          </Link>

          {/* Liens de navigation */}
          <div className="hidden items-center gap-8 text-sm font-semibold md:flex"
               style={{ color: 'var(--color-text-muted)' }}>
            <a className="transition-colors duration-150 hover:opacity-70" href="#comment-ca-marche">
              {t('landing.nav.how_it_works')}
            </a>
            <a className="transition-colors duration-150 hover:opacity-70" href="#cursus">
              {t('landing.nav.courses')}
            </a>
            <a className="transition-colors duration-150 hover:opacity-70" href="#pricing">
              {t('landing.nav.pricing')}
            </a>
            <a className="transition-colors duration-150 hover:opacity-70" href="#temoignages">
              {t('landing.nav.testimonials')}
            </a>
            <a className="transition-colors duration-150 hover:opacity-70" href="#faq">
              {t('landing.nav.faq')}
            </a>
          </div>

          {/* Langue + CTA + ThemeToggle */}
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle variant="icon" />
            <Link
              to={ROUTES.LOGIN}
              className="hidden text-sm font-semibold sm:inline-flex transition-colors duration-150"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('landing.nav.login')}
            </Link>
            <Link to={ROUTES.REGISTER} className="btn-primary">
              {t('landing.nav.cta')}
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Contenu ── */}
      <main className="pt-20">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout