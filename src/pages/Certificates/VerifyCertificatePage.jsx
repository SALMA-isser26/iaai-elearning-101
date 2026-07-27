// src/pages/Certificates/VerifyCertificatePage.jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { verifyCertificatePublic } from '@/services/certificateService'
import logo from '@/assets/logo-iaai.png'
import { ROUTES } from '@/constants/routes'

export default function VerifyCertificatePage() {
  const { certificateNumber } = useParams()
  const [loading, setLoading] = useState(true)
  const [cert, setCert] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    verifyCertificatePublic(certificateNumber)
      .then((data) => { if (active) setCert(data) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [certificateNumber])

  const date = cert
    ? new Date(cert.issued_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-[#f8f5ff] flex flex-col items-center px-4 py-10">
      <Link to={ROUTES.HOME} className="mb-8">
        <img src={logo} alt="IAAI eLearning 101" className="h-14 object-contain" />
      </Link>

      <div className="w-full max-w-lg">
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center gap-3 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-[#e5eeff]" />
            <div className="h-4 w-40 bg-[#e5eeff] rounded" />
            <div className="h-3 w-56 bg-[#e5eeff] rounded" />
          </div>
        )}

        {!loading && !cert && (
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-red-500">error</span>
            </div>
            <h1 className="text-xl font-bold text-[#0b1c30]">Certificat introuvable</h1>
            <p className="text-sm text-[#7e7385]">
              Aucun certificat ne correspond à l'identifiant{' '}
              <span className="font-mono font-bold">{certificateNumber}</span>.
              Vérifiez le lien ou l'identifiant fourni.
            </p>
          </div>
        )}

        {!loading && cert && (
          <div className="rounded-2xl border-[3px] border-yellow-500 p-2">
            <div className="bg-white rounded-xl shadow-xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[300px]">verified_user</span>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full border-4 border-green-500 bg-green-50 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-green-600 text-[32px]">check_circle</span>
                </div>

                <h1 className="text-lg font-bold text-green-600 mb-1">Certificat valide</h1>
                <p className="text-xs text-[#7e7385] mb-6">
                  Délivré par la Direction de l'IAAI Academy
                </p>

                <h2 className="text-2xl font-extrabold text-[#8127cf] mb-6 tracking-tight">
                  {cert.full_name}
                </h2>

                <p className="max-w-md text-[#4d4354] text-sm mb-6 leading-relaxed">
                  A complété avec succès le parcours{' '}
                  <span className="font-bold">{cert.module_title || 'IAAI e-Learning 101'}</span>
                  {' '}avec un score de{' '}
                  <span className="font-bold text-[#8127cf]">{cert.score}%</span>
                </p>

                <div className="w-full flex justify-between items-center text-xs text-[#7e7385] border-t border-[#f0f0f5] pt-4 mt-2">
                  <span>Casablanca, {date}</span>
                  <span className="font-mono font-bold text-[#0b1c30]">{cert.certificate_number}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
