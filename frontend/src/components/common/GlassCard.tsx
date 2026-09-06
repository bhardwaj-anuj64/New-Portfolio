import { motion } from 'framer-motion'
import type { GlassCardProps } from '../../types'

export function GlassCard({ children, className = '', onClick }: GlassCardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </motion.div>
  )
}
