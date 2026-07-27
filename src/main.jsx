import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@/i18n/index.js'
import App from './App.jsx'
import { ToastProvider } from '@/components/ui/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import { initSentry } from '@/lib/sentry'

// Monitoring d'erreurs — no-op si VITE_SENTRY_DSN n'est pas configuré
// ou si on n'est pas en build de production (voir src/lib/sentry.js).
initSentry()

// Service Worker registration for PWA — uniquement en production.
// En dev, le SW mettait en cache le bundle Vite (stratégie cache-first) et
// servait du code JS périmé après chaque modification, causant des bugs
// fantômes qui n'existent plus dans le code source.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope)
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  })
}

// Fallback for missing root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found. Check index.html')
  throw new Error('Root element #root not found in DOM')
}

createRoot(rootElement).render(
  <StrictMode>
    {/* ErrorBoundary global — intercepte tout crash JS non géré dans l'arbre React */}
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)