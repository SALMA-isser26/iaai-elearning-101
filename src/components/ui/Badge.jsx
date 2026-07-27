
export default function Badge({ 
  children, 
  variant = 'primary', 
  className = '' 
}) {
  const baseStyles = "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-300";
  
  const variants = {
    primary: "bg-purple-50 text-brand-purple border border-purple-100",
    secondary: "bg-pink-50 text-brand-pink border border-pink-100",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border border-amber-100",
    info: "bg-blue-50 text-brand-blue border border-blue-100",
    dark: "bg-slate-900 text-white border border-slate-800"
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
