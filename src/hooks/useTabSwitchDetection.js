// src/hooks/useTabSwitchDetection.js
import { useEffect, useRef } from 'react'

/**
 * Détecte le changement d'onglet (visibilitychange) et la perte de focus de
 * la fenêtre (blur — utile quand l'étudiant bascule vers une autre appli
 * comme ChatGPT sans changer d'onglet, ex: alt-tab ou app en overlay).
 *
 * Limites connues (à documenter côté produit) :
 * - Un second écran avec une autre appli ouverte à côté ne déclenche rien
 *   tant que la fenêtre du quiz reste au premier plan.
 * - Un utilisateur qui désactive JS contourne totalement la détection.
 * - `active` doit être `false` pendant l'écran d'intro/résultat pour éviter
 *   les faux positifs hors phase de quiz.
 *
 * @param {boolean} active - n'écoute que si true (ex: phase === 'questions')
 * @param {() => void} onViolation - appelé UNE SEULE FOIS à la première sortie détectée
 */
export function useTabSwitchDetection(active, onViolation) {
  const triggeredRef = useRef(false)
  const callbackRef = useRef(onViolation)

  // Synchroniser la ref avec la dernière callback reçue, hors du render
  // (affecter callbackRef.current pendant le render viole les règles de
  // pureté de React — voir react-hooks/refs).
  useEffect(() => {
    callbackRef.current = onViolation
  }, [onViolation])

  useEffect(() => {
    triggeredRef.current = false
  }, [active])

  useEffect(() => {
    if (!active) return

    const trigger = (type) => {
      if (triggeredRef.current) return
      triggeredRef.current = true
      callbackRef.current?.(type)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) trigger('tab_hidden')
    }

    const handleBlur = () => trigger('window_blur')

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [active])
}