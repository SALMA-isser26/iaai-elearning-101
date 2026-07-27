// src/components/ui/OnboardingBrainArt.jsx
function OnboardingBrainArt() {
  return (
    <svg viewBox="0 0 320 320" className="w-full h-full rounded-3xl shadow-2xl">
      <defs>
        <linearGradient id="ob-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1030" />
          <stop offset="100%" stopColor="#2d1052" />
        </linearGradient>
        <radialGradient id="ob-glow-pink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ob-glow-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ob-node" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="ob-strand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      <rect width="320" height="320" rx="28" fill="url(#ob-bg)" />
      <circle cx="230" cy="90" r="120" fill="url(#ob-glow-pink)" />
      <circle cx="90" cy="240" r="110" fill="url(#ob-glow-cyan)" />

      {/* Silhouette cerveau stylisée, formée de courbes fluides */}
      <g opacity="0.95">
        <path
          d="M160 60c-38 0-64 26-64 58 0 14 5 24 13 33-9 8-15 19-15 33 0 27 22 48 51 51 6 14 20 24 37 24 16 0 30-9 37-22 26-4 45-25 45-51 0-13-5-24-13-32 7-9 11-19 11-31 0-33-27-58-63-58-6 0-11 1-16 2-6-5-14-7-23-7z"
          fill="none"
          stroke="url(#ob-strand)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M160 78c-16 4-27 17-27 33M193 78c16 4 27 17 27 33M124 168c-10 8-16 19-16 30M212 170c9 8 15 18 15 29M148 214c4 10 13 17 24 19M172 233c11-2 20-9 24-19"
          fill="none"
          stroke="url(#ob-strand)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <line x1="160" y1="72" x2="160" y2="232" stroke="url(#ob-strand)" strokeWidth="1.5" opacity="0.5" />
      </g>

      {/* Nœuds lumineux */}
      {[
        [160, 72], [122, 100], [198, 100], [108, 150], [212, 150],
        [130, 195], [190, 195], [160, 232], [160, 150],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 8 ? 6 : 3.5} fill="url(#ob-node)" />
      ))}

      {/* Base / socle */}
      <ellipse cx="160" cy="268" rx="46" ry="8" fill="#a855f7" opacity="0.25" />
    </svg>
  )
}

export default OnboardingBrainArt
