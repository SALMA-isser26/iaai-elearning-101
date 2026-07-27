// src/pages/Certificates/CertificatesPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUserCertificates } from '@/services/certificateService'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function CertSkeleton() {
  return (
    <div className="pb-12 animate-pulse">
      <div className="h-8 w-64 bg-[#e5eeff] rounded mb-2" />
      <div className="h-4 w-48 bg-[#e5eeff] rounded mb-8" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[60%] h-96 bg-[#e5eeff] rounded-2xl" />
        <div className="w-full lg:w-[40%] flex flex-col gap-4">
          <div className="h-48 bg-[#e5eeff] rounded-2xl" />
          <div className="h-40 bg-[#e5eeff] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Certificat vide (aucun certificat encore) ────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-24 h-24 rounded-full bg-[#f0dbff] flex items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[#8127cf]">workspace_premium</span>
      </div>
      <h3 className="text-xl font-bold text-[#0b1c30]">Pas encore de certificat</h3>
      <p className="text-[#7e7385] text-sm text-center max-w-sm">
        Complétez un module et réussissez le quiz pour obtenir votre premier certificat.
      </p>
    </div>
  )
}

// ─── Carte certificat (sélecteur, si plusieurs certificats) ──────────────────
function CertificateCard({ cert, isSelected, onClick }) {
  const date = new Date(cert.issued_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all
                  ${isSelected
                    ? 'border-[#8127cf] bg-[#f0dbff]/30'
                    : 'border-[#f0f0f5] bg-white hover:border-[#8127cf]/30'}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-yellow-600 text-[22px]">verified</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0b1c30] truncate">
            {cert.modules?.title || 'IAAI e-Learning 101'}
          </p>
          <p className="text-xs text-[#7e7385]">{date} · {cert.score}%</p>
        </div>
        {isSelected && (
          <span className="material-symbols-outlined text-[#8127cf] text-[20px]">check_circle</span>
        )}
      </div>
    </button>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const { user } = useAuthStore()
  const fullName = user?.fullName || 'Apprenant'

  const [certificates, setCertificates] = useState([])
  const [selected, setSelected]         = useState(0)
  const [loading, setLoading]           = useState(true)
  const [copied, setCopied]             = useState(false)
  const [downloading, setDownloading]   = useState(false)

  const certRef = useRef(null)

  // ── Charger les certificats ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const data = await getUserCertificates(user.id)
        setCertificates(data)
      } catch (err) {
        console.error('Erreur chargement certificats:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (loading) return <CertSkeleton />
  if (!certificates.length) return <EmptyState />

  const cert = certificates[selected]
  const moduleTitle = cert.modules?.title || 'IAAI e-Learning 101'
  const date = new Date(cert.issued_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const verifyUrl = `${window.location.origin}/verify/${cert.certificate_number}`

  // ── Copier le lien public ────────────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Partager sur LinkedIn ────────────────────────────────────────────────────
  const handleShareLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600')
  }

  // ── Télécharger le certificat en PDF ─────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!certRef.current || downloading) return
    setDownloading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`Certificat-IAAI-${cert.certificate_number}.pdf`)
    } catch (err) {
      console.error('Erreur génération PDF:', err)
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="pb-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-[#0b1c30]">
          Mes Certificats
        </h1>
        <p className="text-sm text-[#7e7385] mt-1">
          {certificates.length} certificat{certificates.length > 1 ? 's' : ''} obtenu{certificates.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Sélecteur si plusieurs certificats ─────────────────────────────── */}
      {certificates.length > 1 && (
        <div className="flex flex-col gap-2 mb-6">
          {certificates.map((c, i) => (
            <CertificateCard
              key={c.id}
              cert={c}
              isSelected={i === selected}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>
      )}

      {/* ── Layout 2 colonnes ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Colonne gauche : Certificat (60%) — cadre doré façon diplôme ───── */}
        <div className="w-full lg:w-[60%]">
          <div className="rounded-2xl border-[3px] border-yellow-500 p-2">
            <div
              ref={certRef}
              className="bg-white rounded-xl shadow-xl p-8 md:p-12 relative overflow-hidden"
            >

              {/* Filigrane */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none
                              flex items-center justify-center">
                <span className="material-symbols-outlined text-[400px]">verified_user</span>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">

                {/* Banner */}
                <div className="w-full h-14 rounded-xl mb-10 flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}>
                  <span className="text-white font-bold tracking-widest uppercase text-sm">
                    IAAI ACADEMY
                  </span>
                </div>

                {/* Titre */}
                <h2 className="text-2xl font-bold text-[#0b1c30] italic mb-4">
                  Certificat de Complétion
                </h2>
                <div className="w-32 h-0.5 bg-yellow-500 mb-8" />

                <p className="text-[#7e7385] text-sm mb-4">Ce certificat est décerné à</p>

                {/* Nom */}
                <h3 className="text-4xl font-extrabold text-[#8127cf] mb-8 tracking-tight font-display">
                  {fullName}
                </h3>

                <p className="max-w-md text-[#4d4354] text-base mb-10 leading-relaxed">
                  Pour avoir complété avec succès le parcours{' '}
                  <span className="font-bold">{moduleTitle}</span>
                  {' '}avec un score de{' '}
                  <span className="font-bold text-[#8127cf]">{cert.score}%</span>
                </p>

                {/* Footer certificat */}
                <div className="w-full flex flex-col md:flex-row justify-between
                                items-end mt-8 px-4 gap-8">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full border-4 border-yellow-500
                                    flex items-center justify-center bg-yellow-50 mb-2">
                      <span className="material-symbols-outlined text-yellow-600 text-[40px]">
                        verified
                      </span>
                    </div>
                    <p className="text-xs text-[#7e7385] italic">Sceau Officiel</p>
                  </div>

                  <div className="text-center md:text-right">
                    <p className="text-sm text-[#4d4354] mb-2">Casablanca, {date}</p>
                    <div className="w-48 h-px bg-[#cfc2d6] mb-2" />
                    <p className="text-sm font-bold text-[#0b1c30]">Direction de l'IAAI Academy</p>
                  </div>
                </div>

                <div className="mt-12 pt-6 border-t border-[#f0f0f5] w-full">
                  <p className="text-xs text-[#7e7385] uppercase tracking-widest">
                    IAAI Academy · Maroc · {cert.certificate_number}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne droite : Actions (40%) ─────────────────────────────────── */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4">

          {/* Détails */}
          <div className="bg-white rounded-2xl p-6 border border-[#8127cf]/10 shadow-sm">
            <h4 className="text-lg font-bold font-display text-[#0b1c30] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8127cf]">info</span>
              Détails du parcours
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Parcours',       value: moduleTitle,  type: 'text'  },
                { label: 'Niveau',         value: cert.modules?.level || 'Débutant', type: 'badge' },
                { label: 'Score obtenu',   value: `${cert.score}%`, type: 'score' },
                { label: 'Date obtention', value: date,          type: 'text'  },
                { label: 'Numéro',         value: cert.certificate_number, type: 'mono' },
              ].map((item, i) => (
                <div key={i}
                     className={`flex justify-between items-center py-2
                                 ${i < 4 ? 'border-b border-[#f0f0f5]' : ''}`}>
                  <span className="text-sm text-[#7e7385]">{item.label}</span>
                  {item.type === 'badge' && (
                    <span className="bg-[#f0dbff] text-[#8127cf] px-3 py-1 rounded-full text-xs font-bold">
                      {item.value}
                    </span>
                  )}
                  {item.type === 'score' && (
                    <span className="text-green-600 font-bold text-sm">{item.value}</span>
                  )}
                  {item.type === 'text' && (
                    <span className="font-bold text-[#0b1c30] text-sm text-right max-w-[60%] truncate">{item.value}</span>
                  )}
                  {item.type === 'mono' && (
                    <span className="font-mono text-xs text-[#0b1c30] font-bold">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Partager */}
          <div className="bg-white rounded-2xl p-6 border border-[#8127cf]/10 shadow-sm">
            <h4 className="text-lg font-bold font-display text-[#0b1c30] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8127cf]">share</span>
              Partager
            </h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleShareLinkedIn}
                className="w-full bg-[#0077B5] text-white py-3 rounded-xl
                           font-bold text-sm flex items-center justify-center gap-2
                           hover:brightness-110 transition-all"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                Partager sur LinkedIn
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="w-full text-white py-3 rounded-xl
                           font-bold text-sm flex items-center justify-center gap-2
                           hover:brightness-110 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {downloading ? 'progress_activity' : 'download'}
                </span>
                {downloading ? 'Génération...' : 'Télécharger en PDF'}
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full border border-[#8127cf] text-[#8127cf] py-3
                           rounded-xl font-bold text-sm
                           flex items-center justify-center gap-2
                           hover:bg-[#8127cf]/5 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'link'}
                </span>
                {copied ? 'Lien copié !' : 'Copier le lien public'}
              </button>
            </div>
          </div>

          {/* Vérification */}
          <div className="bg-white rounded-2xl p-6 border-2 border-[#8127cf]/10 shadow-sm">
            <h4 className="text-lg font-bold font-display text-[#0b1c30] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8127cf]">verified</span>
              Vérification
            </h4>
            <p className="text-sm text-[#7e7385] mb-1">
              ID unique :{' '}
              <span className="font-mono font-bold text-[#0b1c30]">{cert.certificate_number}</span>
            </p>
            <p className="text-xs text-[#7e7385] italic mb-4">
              Ce certificat est vérifiable en ligne via notre portail de sécurité pour garantir son authenticité.
            </p>
            <a
              href={`/verify/${cert.certificate_number}`}
              className="w-full border border-[#8127cf]/30 text-[#8127cf] py-2.5
                         rounded-xl font-bold text-sm flex items-center justify-center gap-2
                         hover:bg-[#8127cf]/5 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Vérifier ce certificat
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}