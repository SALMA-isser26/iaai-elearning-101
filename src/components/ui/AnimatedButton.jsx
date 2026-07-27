import { motion } from 'framer-motion';

export default function AnimatedButton({ children, onClick, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-brand-pink to-brand-purple text-white',
    secondary: 'bg-violet-100 text-violet-900 dark:bg-slate-700 dark:text-slate-200',
    outline: 'border-2 border-violet-200 bg-white text-violet-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-150 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
