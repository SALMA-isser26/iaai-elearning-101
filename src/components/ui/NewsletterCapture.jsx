// src/components/ui/NewsletterCapture.jsx
// Composant de capture d'emails pour la newsletter

import { useState } from 'react'
import { subscribeToNewsletter } from '@/services/newsletterService'
import { Mail, CheckCircle, Loader2 } from 'lucide-react'

export default function NewsletterCapture() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError(null)
    
    const { error: err } = await subscribeToNewsletter(email, firstName, 'landing')
    
    setLoading(false)
    
    if (err) {
      setError(err)
    } else {
      setSuccess(true)
      setEmail('')
      setFirstName('')
    }
  }

  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border border-green-200">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-2">
          Inscription réussie !
        </h3>
        <p className="text-green-700">
          Vous recevrez bientôt nos dernières actualités sur l'IA.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl p-8 border border-violet-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Restez informé</h3>
          <p className="text-gray-600 text-sm">Recevez nos actualités sur l'IA</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Votre prénom (optionnel)"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email *"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
        
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Inscription...
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              S'inscrire à la newsletter
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-gray-500 mt-4 text-center">
        En vous inscrivant, vous acceptez de recevoir des emails de notre part. 
        Vous pouvez vous désabonner à tout moment.
      </p>
    </div>
  )
}
