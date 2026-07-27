// src/components/ui/AuthHeader.jsx
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import Logo from '@/components/ui/Logo'

export default function AuthHeader() {
  return (
    <header className="w-full px-6 md:px-10 py-5">
      <Link to={ROUTES.HOME} className="inline-block hover:opacity-80 transition-opacity">
        <Logo size="md" />
      </Link>
    </header>
  )
}
