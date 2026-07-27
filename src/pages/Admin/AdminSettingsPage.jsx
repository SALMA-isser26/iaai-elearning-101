// src/pages/Admin/AdminSettingsPage.jsx
// Page admin pour la configuration système

import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { logAdminAction } from '@/services/auditLogService'
import { Save, RefreshCw, Shield, CreditCard, Mail, Settings as SettingsIcon, AlertTriangle, CheckCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  
  const [settings, setSettings] = useState({
    // Général
    siteName: 'IAAI eLearning 101',
    siteDescription: 'Plateforme d\'apprentissage de l\'intelligence artificielle',
    maintenanceMode: false,
    allowRegistration: true,
    maxUsers: 1000,
    
    // Paiement (les clés secrètes ne vivent jamais ici, voir PaymentSettings)
    stripePublicKey: '',
    priceFree: 0,
    pricePremium: 29.99,
    currency: 'EUR',
    trialDays: 7,
    
    // Email (l'envoi passe par Supabase Auth / Edge Functions, pas de SMTP custom pour l'instant)
    emailFrom: 'noreply@iaai-elearning.com',
    emailFromName: 'IAAI eLearning',
    
    // Sécurité
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    
    // Contenu
    autoPublishFAQs: false,
    moderateTestimonials: true,
    defaultLessonOrder: 'sequential',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    setError(null)
    try {
      const { data: row, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 1)
        .maybeSingle()

      if (error) throw error

      // `row` est null si la migration n'a pas encore été appliquée sur cet
      // environnement (table vide/absente) : on garde alors les valeurs par
      // défaut déjà présentes dans le state plutôt que d'afficher une erreur.
      if (row?.data) {
        setSettings((current) => ({ ...current, ...row.data }))
      }
    } catch (err) {
      console.error('[AdminSettingsPage]', err)
      setError('Impossible de charger les paramètres. Valeurs par défaut affichées.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('settings')
        .upsert([{ id: 1, data: settings, updated_by: user?.id ?? null }])

      if (error) throw error

      logAdminAction('settings.update', { targetType: 'settings', targetId: '1', details: settings })

      setSuccess('Paramètres enregistrés avec succès.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('[AdminSettingsPage]', err)
      setError('Erreur lors de l\'enregistrement des paramètres.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (window.confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) {
      setSettings({
        siteName: 'IAAI eLearning 101',
        siteDescription: 'Plateforme d\'apprentissage de l\'intelligence artificielle',
        maintenanceMode: false,
        allowRegistration: true,
        maxUsers: 1000,
        stripePublicKey: '',
        priceFree: 0,
        pricePremium: 29.99,
        currency: 'EUR',
        trialDays: 7,
        emailFrom: 'noreply@iaai-elearning.com',
        emailFromName: 'IAAI eLearning',
        requireEmailVerification: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        autoPublishFAQs: false,
        moderateTestimonials: true,
        defaultLessonOrder: 'sequential',
      })
    }
  }

  const tabs = [
    { id: 'general', label: 'Général', icon: SettingsIcon },
    { id: 'payment', label: 'Paiement', icon: CreditCard },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'content', label: 'Contenu', icon: SettingsIcon },
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-2">Configuration de la plateforme</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'general' && <GeneralSettings settings={settings} onChange={setSettings} />}
        {activeTab === 'payment' && <PaymentSettings settings={settings} onChange={setSettings} />}
        {activeTab === 'email' && <EmailSettings settings={settings} onChange={setSettings} />}
        {activeTab === 'security' && <SecuritySettings settings={settings} onChange={setSettings} />}
        {activeTab === 'content' && <ContentSettings settings={settings} onChange={setSettings} />}
      </div>
    </div>
  )
}

// ─── General Settings ───────────────────────────────────────────────────────
function GeneralSettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Paramètres généraux</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du site
          </label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => onChange({ ...settings, siteName: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description du site
          </label>
          <input
            type="text"
            value={settings.siteDescription}
            onChange={(e) => onChange({ ...settings, siteDescription: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre maximum d'utilisateurs
          </label>
          <input
            type="number"
            value={settings.maxUsers}
            onChange={(e) => onChange({ ...settings, maxUsers: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="0"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Toggle
          label="Mode maintenance"
          description="Désactive l'accès à la plateforme pour les utilisateurs"
          checked={settings.maintenanceMode}
          onChange={(checked) => onChange({ ...settings, maintenanceMode: checked })}
        />
        
        <Toggle
          label="Autoriser les inscriptions"
          description="Permet aux nouveaux utilisateurs de s'inscrire"
          checked={settings.allowRegistration}
          onChange={(checked) => onChange({ ...settings, allowRegistration: checked })}
        />
      </div>
    </div>
  )
}

// ─── Payment Settings ────────────────────────────────────────────────────────
function PaymentSettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Configuration Stripe</h3>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          La clé secrète Stripe n'est plus modifiable ici : elle ne doit jamais transiter
          par le navigateur ni être stockée dans une table lisible côté client. Elle est
          configurée comme secret d'Edge Function (<code className="font-mono">STRIPE_SECRET_KEY</code>)
          via <code className="font-mono">supabase secrets set STRIPE_SECRET_KEY=sk_live_...</code>,
          déjà utilisée par <code className="font-mono">stripe-checkout</code> et{' '}
          <code className="font-mono">stripe-webhook</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clé publique Stripe
          </label>
          <input
            type="text"
            value={settings.stripePublicKey}
            onChange={(e) => onChange({ ...settings, stripePublicKey: e.target.value })}
            placeholder="pk_live_..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Clé publique uniquement — sans risque à stocker ici, mais préférez `VITE_STRIPE_PUBLISHABLE_KEY` côté build si possible.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prix gratuit (€)
          </label>
          <input
            type="number"
            value={settings.priceFree}
            onChange={(e) => onChange({ ...settings, priceFree: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="0"
            step="0.01"
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prix premium (€)
          </label>
          <input
            type="number"
            value={settings.pricePremium}
            onChange={(e) => onChange({ ...settings, pricePremium: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Devise
          </label>
          <select
            value={settings.currency}
            onChange={(e) => onChange({ ...settings, currency: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="EUR">EUR (Euro)</option>
            <option value="USD">USD (Dollar américain)</option>
            <option value="GBP">GBP (Livre sterling)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durée d'essai (jours)
          </label>
          <input
            type="number"
            value={settings.trialDays}
            onChange={(e) => onChange({ ...settings, trialDays: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="0"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Email Settings ───────────────────────────────────────────────────────────
function EmailSettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Configuration Email</h3>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Les identifiants SMTP (hôte, port, utilisateur, mot de passe) ont été retirés de
          cette page : ils n'étaient reliés à aucun envoi réel et un mot de passe SMTP en
          clair dans une table lisible côté client serait un risque de sécurité inutile.
          Les emails transactionnels (invitations, vérification) passent aujourd'hui par
          Supabase Auth. Pour un fournisseur SMTP personnalisé, configure-le directement
          dans Supabase → Authentication → Email plutôt qu'ici.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email d'envoi
          </label>
          <input
            type="email"
            value={settings.emailFrom}
            onChange={(e) => onChange({ ...settings, emailFrom: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom de l'expéditeur
          </label>
          <input
            type="text"
            value={settings.emailFromName}
            onChange={(e) => onChange({ ...settings, emailFromName: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Security Settings ───────────────────────────────────────────────────────
function SecuritySettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Paramètres de sécurité</h3>
      
      <div className="space-y-4">
        <Toggle
          label="Vérification email requise"
          description="Les utilisateurs doivent vérifier leur email avant de pouvoir se connecter"
          checked={settings.requireEmailVerification}
          onChange={(checked) => onChange({ ...settings, requireEmailVerification: checked })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Délai d'expiration de session (minutes)
          </label>
          <input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => onChange({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="5"
          />
          <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Pas encore appliqué techniquement — à venir.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tentatives de connexion max
          </label>
          <input
            type="number"
            value={settings.maxLoginAttempts}
            onChange={(e) => onChange({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="1"
          />
          <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Verrouillage réel appliqué à la connexion.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durée de verrouillage (minutes)
          </label>
          <input
            type="number"
            value={settings.lockoutDuration}
            onChange={(e) => onChange({ ...settings, lockoutDuration: parseInt(e.target.value) || 15 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            min="1"
          />
          <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Verrouillage réel appliqué à la connexion.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Content Settings ───────────────────────────────────────────────────────
function ContentSettings({ settings, onChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Paramètres de contenu</h3>
      
      <div className="space-y-4">
        <Toggle
          label="Publication automatique des FAQs"
          description="Les nouvelles FAQs sont publiées automatiquement sans modération"
          checked={settings.autoPublishFAQs}
          onChange={(checked) => onChange({ ...settings, autoPublishFAQs: checked })}
        />
        
        <Toggle
          label="Modération des témoignages"
          description="Les témoignages doivent être approuvés avant d'être affichés"
          checked={settings.moderateTestimonials}
          onChange={(checked) => onChange({ ...settings, moderateTestimonials: checked })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ordre par défaut des leçons
        </label>
        <select
          value={settings.defaultLessonOrder}
          onChange={(e) => onChange({ ...settings, defaultLessonOrder: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="sequential">Séquentiel (ordre défini)</option>
          <option value="alphabetical">Alphabétique</option>
          <option value="newest">Plus récent d'abord</option>
          <option value="oldest">Plus ancien d'abord</option>
        </select>
      </div>
    </div>
  )
}

// ─── Toggle Component ────────────────────────────────────────────────────────
function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start gap-4">
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-violet-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-900">{label}</label>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}
