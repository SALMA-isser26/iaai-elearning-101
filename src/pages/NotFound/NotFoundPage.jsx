// src/pages/NotFound/NotFoundPage.jsx
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import ARIAFloatingAssistant from '@/components/ui/ARIAFloatingAssistant'
import Logo from '@/components/ui/Logo'
import robot404 from '@/assets/robot-404.png'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f8f5ff] flex items-center justify-center p-6">
      <Link to={ROUTES.HOME} className="fixed top-6 left-6 z-20 hover:opacity-80 transition-opacity">
        <Logo size="sm" />
      </Link>

      <div className="text-center max-w-md">

        {/* Code erreur */}
        <p
          className="text-9xl font-extrabold font-display mb-6 tracking-tight"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          404
        </p>

        {/* Illustration */}
        <div className="mx-auto mb-8 w-72 sm:w-80 rounded-3xl overflow-hidden shadow-xl animate-float">
          <img src={robot404} alt="Robot ARIA perplexe" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-2xl font-extrabold font-display text-[#0b1c30] mb-3">
          Oups ! Page introuvable
        </h1>
        <p className="text-[#7e7385] mb-8 leading-relaxed">
          La page que vous cherchez n'existe pas ou a été déplacée par nos algorithmes.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm hover:shadow-lg hover:shadow-[#8127cf]/20 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour au Dashboard
          </Link>
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#8127cf]/20 text-[#8127cf] font-bold text-sm hover:bg-[#8127cf]/5 transition-all"
          >
            Retour à l'accueil
          </Link>
        </div>

        {/* Signaler un problème */}
        <button
          onClick={() => navigate(ROUTES.COMMUNITY)}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#a89fb5] hover:text-[#8127cf] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">info</span>
          Signaler un problème
        </button>
      </div>

      <ARIAFloatingAssistant />
    </div>
  )
}
