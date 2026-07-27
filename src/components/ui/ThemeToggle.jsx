// src/components/ui/ThemeToggle.jsx
import { useTheme } from '@/hooks/useTheme'

/**
 * Bouton de basculement de thème avec animation fluide.
 * Props :
 *   variant : 'icon' (défaut) | 'pill'
 *   className : classes CSS additionnelles
 */
export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { isDark, theme, setTheme } = useTheme()

  // Cycle : light → dark → system → light
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const label =
    theme === 'dark'   ? 'Mode sombre actif — cliquer pour suivre le système' :
    theme === 'light'  ? 'Mode clair actif — cliquer pour le mode sombre' :
    `Suit le système (${isDark ? 'sombre' : 'clair'}) — cliquer pour le mode clair`

  if (variant === 'pill') {
    return (
      <button
        onClick={cycleTheme}
        aria-label={label}
        title={label}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                    transition-all duration-200 hover:scale-105 active:scale-95 ${className}`}
        style={{
          background: 'var(--color-bg-muted)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Icône animée */}
        <span
          className="material-symbols-outlined text-[16px] transition-transform duration-500"
          style={{
            transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
            fontVariationSettings: "'FILL' 1",
          }}
        >
          {isDark ? 'dark_mode' : theme === 'system' ? 'routine' : 'light_mode'}
        </span>
        <span className="hidden sm:inline">
          {theme === 'dark' ? 'Sombre' : theme === 'light' ? 'Clair' : 'Auto'}
        </span>
      </button>
    )
  }

  // Variant 'icon' (défaut)
  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-200 hover:scale-110 active:scale-95
                  focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      style={{
        background: 'var(--color-bg-hover)',
        color: 'var(--color-primary)',
      }}
    >
      {/* Soleil */}
      <span
        className="material-symbols-outlined text-[20px] absolute transition-all duration-300"
        style={{
          fontVariationSettings: "'FILL' 1",
          opacity:   isDark ? 0 : 1,
          transform: isDark ? 'scale(0.5) rotate(-90deg)' : 'scale(1) rotate(0deg)',
        }}
      >
        light_mode
      </span>

      {/* Lune */}
      <span
        className="material-symbols-outlined text-[20px] absolute transition-all duration-300"
        style={{
          fontVariationSettings: "'FILL' 1",
          opacity:   isDark ? 1 : 0,
          transform: isDark ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(90deg)',
        }}
      >
        dark_mode
      </span>

      {/* Indicateur mode système */}
      {theme === 'system' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
          style={{
            background: 'var(--color-primary)',
            borderColor: 'var(--color-bg)',
          }}
          title="Mode système"
        />
      )}
    </button>
  )
}
