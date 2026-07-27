// src/pages/Settings/SettingsPage.jsx
import { useToast } from '@/components/ui/Toast'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import i18n from '@/i18n'
import {
  loadUserSettings,
  saveAccountInfo,
  changePassword,
  saveNotificationPrefs,
  savePrivacyPrefs,
  saveLanguePref,
  uploadAvatar,
  DEFAULT_PREFERENCES,
} from '@/services/settingsService'

// ─── Sections de navigation ───────────────────────────────────────────────────
const sections = [
  { id: 'compte',          label: 'Compte',          icon: 'manage_accounts' },
  { id: 'notifications',   label: 'Notifications',   icon: 'notifications' },
  { id: 'confidentialite', label: 'Confidentialité', icon: 'lock' },
  { id: 'langue',          label: 'Langue & Région', icon: 'language' },
  { id: 'danger',          label: 'Zone de danger',  icon: 'warning', danger: true },
]

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      className={`relative w-11 h-6 rounded-full transition-colors duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${checked ? 'bg-[#8127cf]' : 'bg-[#ded6f3]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                    transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ded6f3] p-6 mb-5">
      <div className="mb-5 pb-4 border-b border-[#f0dbff]">
        <h3 className="text-lg font-bold text-[#17132f]">{title}</h3>
        {subtitle && <p className="text-sm text-[#68627a] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Feedback inline ─────────────────────────────────────────────────────────
function Feedback({ state }) {
  if (state === 'saved') return (
    <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      Enregistré
    </span>
  )
  if (state === 'saving') return (
    <span className="flex items-center gap-1.5 text-[#8127cf] text-sm">
      <span className="w-3.5 h-3.5 border-2 border-[#8127cf]/30 border-t-[#8127cf] rounded-full animate-spin" />
      Enregistrement...
    </span>
  )
  if (state === 'error') return (
    <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
      <span className="material-symbols-outlined text-[18px]">error</span>
      Erreur — réessayez
    </span>
  )
  return null
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-40 bg-[#e5eeff] rounded-2xl" />
      <div className="h-48 bg-[#e5eeff] rounded-2xl" />
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast()
  const { user, updateUser } = useAuthStore()

  const [activeSection, setActiveSection] = useState('compte')
  const [loading, setLoading]             = useState(true)

  // ── Compte
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [bio,       setBio]       = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [accountState, setAccountState] = useState(null) // null | 'saving' | 'saved' | 'error'
  const fileInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // ── Mot de passe
  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd,     setNewPwd]       = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [pwdState,   setPwdState]     = useState(null)
  const [pwdError,   setPwdError]     = useState('')

  // ── Notifications
  const [notifs,      setNotifs]      = useState(DEFAULT_PREFERENCES.notifications)
  const [notifState,  setNotifState]  = useState(null)

  // ── Confidentialité
  const [priv,        setPriv]        = useState(DEFAULT_PREFERENCES.privacy)
  const [privState,   setPrivState]   = useState(null)

  // ── Langue
  const [langue,      setLangue]      = useState('fr')
  const [langueState, setLangueState] = useState(null)

  // ── Charger les paramètres depuis Supabase ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const data = await loadUserSettings(user.id)
        const nameParts = (data.full_name || '').split(' ')
        setFirstName(nameParts[0] || '')
        setLastName(nameParts.slice(1).join(' ') || '')
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || null)
        setNotifs(data.preferences.notifications)
        setPriv(data.preferences.privacy)
        setLangue(data.preferences.langue || 'fr')
      } catch (err) {
        console.error('[Settings] Erreur chargement:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  // ─── Helper : feedback temporaire ─────────────────────────────────────────
  const withFeedback = useCallback(async (setStateFn, fn) => {
    setStateFn('saving')
    try {
      await fn()
      setStateFn('saved')
      setTimeout(() => setStateFn(null), 2500)
    } catch (err) {
      console.error('[Settings] Erreur sauvegarde:', err)
      setStateFn('error')
      setTimeout(() => setStateFn(null), 3000)
      return err
    }
  }, [])

  // ─── Sauvegarder les infos du compte ──────────────────────────────────────
  const handleSaveAccount = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!fullName) return

    await withFeedback(setAccountState, async () => {
      await saveAccountInfo(user.id, { fullName, bio })
      updateUser({ fullName })
    })
  }

  // ─── Changer le mot de passe ───────────────────────────────────────────────
  const handleChangePwd = async () => {
    setPwdError('')
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('Tous les champs sont requis.')
      return
    }
    if (newPwd.length < 8) {
      setPwdError('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }

    const err = await withFeedback(setPwdState, async () => {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd })
    })

    if (!err) {
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } else {
      setPwdError(err.message)
    }
  }

  // ─── Upload avatar ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)
      setAvatarUrl(url)
      updateUser({ avatarUrl: url })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  // ─── Sauvegarder les notifications ────────────────────────────────────────
  const handleSaveNotifs = async () => {
    await withFeedback(setNotifState, () => saveNotificationPrefs(user.id, notifs))
  }

  const updateNotif = (key, val) => setNotifs(prev => ({ ...prev, [key]: val }))

  // ─── Sauvegarder la confidentialité ───────────────────────────────────────
  const handleSavePrivacy = async () => {
    await withFeedback(setPrivState, () => savePrivacyPrefs(user.id, priv))
  }

  const updatePriv = (key, val) => setPriv(prev => ({ ...prev, [key]: val }))

  // ─── Sauvegarder la langue ─────────────────────────────────────────────────
  const handleSaveLangue = async (code) => {
    setLangue(code)
    await withFeedback(setLangueState, async () => {
      await saveLanguePref(user.id, code)
      i18n.changeLanguage(code)
    })
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const fullName   = user?.fullName || ''
  const email      = user?.email    || ''
  const initials   = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[#f8f5ff] pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-display text-[#0b1c30]">Paramètres</h2>
        <p className="text-[#68627a] mt-1">Gérez votre compte et vos préférences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Navigation latérale ─────────────────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-[#ded6f3] p-3 sticky top-6">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm
                            font-medium text-left transition-colors mb-1
                            ${activeSection === s.id
                              ? s.danger ? 'bg-red-50 text-red-600' : 'bg-[#f0dbff] text-[#8127cf]'
                              : s.danger ? 'text-red-500 hover:bg-red-50' : 'text-[#4d4354] hover:bg-[#f8f5ff]'
                            }`}
              >
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Contenu principal ───────────────────────────────────────────── */}
        <main className="lg:col-span-3">
          {loading ? <SettingsSkeleton /> : (

          <>
          {/* ════ COMPTE ════ */}
          {activeSection === 'compte' && (
            <>
              <Section
                title="Informations personnelles"
                subtitle="Modifiez vos informations de profil"
              >
                {/* Avatar */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center
                                   text-white text-2xl font-bold"
                        style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                      >
                        {initials}
                      </div>
                    )}
                    {/* Overlay upload */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute inset-0 w-20 h-20 rounded-full bg-black/40
                                 flex items-center justify-center opacity-0 hover:opacity-100
                                 transition-opacity disabled:cursor-wait"
                    >
                      {avatarUploading
                        ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <span className="material-symbols-outlined text-white text-[22px]">photo_camera</span>
                      }
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#17132f]">{fullName}</p>
                    <p className="text-xs text-[#68627a] mt-0.5">
                      {user?.plan === 'premium' ? 'Plan Premium' : 'Plan Gratuit'}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs text-[#8127cf] font-medium hover:underline"
                    >
                      {avatarUploading ? 'Chargement...' : 'Changer la photo'}
                    </button>
                  </div>
                </div>

                {/* Champs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#17132f] mb-1.5">
                      Prénom
                    </label>
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm
                                 focus:outline-none focus:border-[#8127cf] focus:ring-2
                                 focus:ring-[#8127cf]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#17132f] mb-1.5">
                      Nom
                    </label>
                    <input
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm
                                 focus:outline-none focus:border-[#8127cf] focus:ring-2
                                 focus:ring-[#8127cf]/20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#17132f] mb-1.5">
                      Email
                    </label>
                    <input
                      value={email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm
                                 bg-[#f8f5ff] text-[#7e7385] cursor-not-allowed"
                    />
                    <p className="text-xs text-[#7e7385] mt-1">
                      L'email ne peut pas être modifié ici.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#17132f] mb-1.5">
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Parlez de vous en quelques mots..."
                      maxLength={300}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm
                                 focus:outline-none focus:border-[#8127cf] focus:ring-2
                                 focus:ring-[#8127cf]/20 resize-none"
                    />
                    <p className="text-xs text-[#7e7385] text-right mt-0.5">
                      {bio.length}/300
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                  <Feedback state={accountState} />
                  <button
                    onClick={handleSaveAccount}
                    disabled={accountState === 'saving'}
                    className="px-8 py-3 rounded-xl text-white font-semibold text-sm
                               hover:shadow-lg hover:shadow-[#8127cf]/20 transition-all
                               disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
                  >
                    Enregistrer
                  </button>
                </div>
              </Section>

              {/* Mot de passe */}
              <Section title="Sécurité" subtitle="Modifiez votre mot de passe">
                <div className="space-y-4">
                  {[
                    { label: 'Mot de passe actuel', val: currentPwd, set: setCurrentPwd, placeholder: '••••••••••' },
                    { label: 'Nouveau mot de passe', val: newPwd, set: setNewPwd, placeholder: '8 caractères minimum' },
                    { label: 'Confirmer le mot de passe', val: confirmPwd, set: setConfirmPwd, placeholder: 'Répétez le mot de passe' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm font-semibold text-[#17132f] mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type="password"
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#ded6f3] text-sm
                                   focus:outline-none focus:border-[#8127cf] focus:ring-2
                                   focus:ring-[#8127cf]/20"
                      />
                    </div>
                  ))}

                  {pwdError && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {pwdError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-3">
                    <Feedback state={pwdState} />
                    <button
                      onClick={handleChangePwd}
                      disabled={pwdState === 'saving'}
                      className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm
                                 transition-all disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
                    >
                      Changer le mot de passe
                    </button>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ════ NOTIFICATIONS ════ */}
          {activeSection === 'notifications' && (
            <Section
              title="Préférences de notifications"
              subtitle="Choisissez ce que vous souhaitez recevoir"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8127cf] mb-3">
                  Notifications par email
                </p>
                {[
                  { key: 'email_cours',     label: 'Nouveau contenu disponible',    desc: 'Recevez un email quand un nouveau module est publié' },
                  { key: 'email_community', label: 'Réponses dans la communauté',  desc: "Quand quelqu'un répond à votre discussion" },
                  { key: 'email_badge',     label: 'Badges et récompenses',         desc: 'Quand vous obtenez un nouveau badge' },
                  { key: 'email_promo',     label: 'Offres promotionnelles',        desc: 'Réductions et offres spéciales' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-4 border-b border-[#f0dbff] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-[#17132f]">{n.label}</p>
                      <p className="text-xs text-[#68627a]">{n.desc}</p>
                    </div>
                    <Toggle
                      checked={notifs[n.key]}
                      onChange={v => updateNotif(n.key, v)}
                    />
                  </div>
                ))}

                <p className="text-xs font-bold uppercase tracking-wider text-[#8127cf] mt-5 mb-3">
                  Notifications push
                </p>
                {[
                  { key: 'push_rappel',  label: "Rappels d'étude",   desc: 'Rappel quotidien pour maintenir votre progression' },
                  { key: 'push_reponse', label: 'Réponses immédiates', desc: 'Notification instantanée de nouvelles réponses' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-4 border-b border-[#f0dbff] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-[#17132f]">{n.label}</p>
                      <p className="text-xs text-[#68627a]">{n.desc}</p>
                    </div>
                    <Toggle
                      checked={notifs[n.key]}
                      onChange={v => updateNotif(n.key, v)}
                    />
                  </div>
                ))}

                <div className="flex items-center justify-end gap-3 mt-6">
                  <Feedback state={notifState} />
                  <button
                    onClick={handleSaveNotifs}
                    disabled={notifState === 'saving'}
                    className="px-8 py-3 rounded-xl text-white font-semibold text-sm
                               transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </Section>
          )}

          {/* ════ CONFIDENTIALITÉ ════ */}
          {activeSection === 'confidentialite' && (
            <Section
              title="Confidentialité"
              subtitle="Contrôlez la visibilité de votre profil"
            >
              <div className="space-y-1">
                {[
                  { key: 'profil_public',       label: 'Profil public',       desc: 'Votre profil est visible par les autres membres' },
                  { key: 'progression_visible',  label: 'Progression visible', desc: 'Les autres peuvent voir votre avancement dans les cours' },
                  { key: 'badges_visibles',      label: 'Badges affichés',     desc: 'Affichez vos badges sur votre profil public' },
                ].map(p => (
                  <div key={p.key} className="flex items-center justify-between py-4 border-b border-[#f0dbff] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-[#17132f]">{p.label}</p>
                      <p className="text-xs text-[#68627a]">{p.desc}</p>
                    </div>
                    <Toggle
                      checked={priv[p.key]}
                      onChange={v => updatePriv(p.key, v)}
                    />
                  </div>
                ))}

                <div className="flex items-center justify-end gap-3 mt-6">
                  <Feedback state={privState} />
                  <button
                    onClick={handleSavePrivacy}
                    disabled={privState === 'saving'}
                    className="px-8 py-3 rounded-xl text-white font-semibold text-sm
                               transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </Section>
          )}

          {/* ════ LANGUE ════ */}
          {activeSection === 'langue' && (
            <Section
              title="Langue & Région"
              subtitle="Choisissez la langue d'affichage de la plateforme"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#17132f] mb-3">
                    Langue de la plateforme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { code: 'fr', label: 'Français', flag: '🇫🇷', sub: 'Langue par défaut' },
                      { code: 'ar', label: 'العربية',   flag: '🇲🇦', sub: 'RTL supporté' },
                    ].map(l => (
                      <button
                        key={l.code}
                        onClick={() => handleSaveLangue(l.code)}
                        className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2
                                    text-left transition-all
                                    ${langue === l.code
                                      ? 'border-[#8127cf] bg-[#f0dbff]'
                                      : 'border-[#ded6f3] hover:border-[#8127cf]/50'
                                    }`}
                      >
                        <span className="text-2xl">{l.flag}</span>
                        <div>
                          <p className="text-sm font-semibold text-[#17132f]">{l.label}</p>
                          <p className="text-xs text-[#68627a]">{l.sub}</p>
                        </div>
                        {langue === l.code && (
                          <span className="material-symbols-outlined text-[#8127cf] text-[20px] ml-auto">
                            check_circle
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback langue */}
                {langueState && (
                  <div className="flex items-center justify-end">
                    <Feedback state={langueState} />
                  </div>
                )}

                <div className="bg-[#f0dbff]/50 rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#8127cf] text-[20px] shrink-0">info</span>
                  <p className="text-sm text-[#68627a]">
                    Le changement de langue s'applique immédiatement. Le contenu des cours
                    reste disponible en français et en arabe.
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* ════ ZONE DE DANGER ════ */}
          {activeSection === 'danger' && (
            <div className="bg-white rounded-2xl border-2 border-red-200 p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-red-100">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600">Zone de danger</h3>
                  <p className="text-sm text-red-400">Ces actions sont irréversibles. Agissez avec précaution.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-[#17132f]">Exporter mes données</p>
                    <p className="text-xs text-[#68627a]">Téléchargez toutes vos données de compte et de progression</p>
                  </div>
                  <button className="px-4 py-2 rounded-xl border border-red-200 text-red-600
                                     text-sm font-medium hover:bg-red-100 transition-colors">
                    Exporter
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-red-600">Supprimer mon compte</p>
                    <p className="text-xs text-[#68627a]">Suppression définitive de tout votre contenu et progression</p>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm
                                     font-bold hover:bg-red-600 transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </main>
      </div>
    </div>
  )
}