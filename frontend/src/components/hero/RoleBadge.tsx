import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const ROLES = ['Application Development Analyst', 'Full-Stack Engineer', 'Hardware & Systems Tinkerer']

export function RoleBadge() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ROLES.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="inline-flex h-8 items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 backdrop-blur-md">
      <AnimatePresence mode="wait">
        <motion.span
          key={ROLES[index]}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-sm font-medium text-white/80"
        >
          {ROLES[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
