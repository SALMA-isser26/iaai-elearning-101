
export default function ProgressBar({ 
  value = 0, 
  max = 100, 
  showLabel = false, 
  size = 'md',
  className = ''
}) {
  const percentage = Math.min(Math.max(0, Math.round((value / max) * 100)), 100);
  
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label and Percentage */}
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-700">
          <span>Progression</span>
          <span className="bg-gradient-to-r from-brand-pink to-brand-purple bg-clip-text text-transparent">
            {percentage}%
          </span>
        </div>
      )}

      {/* Progress Track */}
      <div className={`w-full bg-purple-50 border border-purple-100/50 rounded-full overflow-hidden ${heightClasses[size]}`}>
        {/* Progress Fill */}
        <div 
          className="h-full bg-gradient-to-r from-brand-pink to-brand-purple rounded-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) relative"
          style={{ width: `${percentage}%` }}
        >
          {/* Subtle Inner Glow Highlight */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-pulse opacity-25" />
        </div>
      </div>
    </div>
  );
}
