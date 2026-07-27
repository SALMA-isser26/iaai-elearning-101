import { motion } from 'framer-motion';

export default function AnimatedCard({ children, className = '', ...props }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border border-violet-100 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
