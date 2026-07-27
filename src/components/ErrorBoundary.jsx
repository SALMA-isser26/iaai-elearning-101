// src/components/ErrorBoundary.jsx
// Composant ErrorBoundary pour capturer et gérer les erreurs de composants React
import { Component } from 'react'
import { reportError } from '@/lib/sentry'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    // No-op en dev / si VITE_SENTRY_DSN absent — voir src/lib/sentry.js
    reportError(error, { componentStack: errorInfo?.componentStack })
    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f5ff] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-[24px]">error</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Une erreur est survenue</h2>
                <p className="text-sm text-slate-500">Le composant a rencontré un problème inattendu</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700 font-mono">
                {this.state.error?.toString() || 'Erreur inconnue'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-3 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 transition-colors"
              >
                Recharger la page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Réessayer
              </button>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-6">
                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                  Détails techniques (dev only)
                </summary>
                <pre className="mt-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl overflow-auto max-h-48">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary