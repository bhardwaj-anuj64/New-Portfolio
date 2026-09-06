import { motion } from 'framer-motion'
import { RoleBadge } from './RoleBadge'

export function Hero() {
  return (
    <section className="flex min-h-[80svh] flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <RoleBadge />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl font-semibold tracking-tight text-white sm:text-6xl"
      >
        Anuj Bhardwaj
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-xl text-balance text-white/60"
      >
        Jack of all trades, master of none, but oftentimes better than a master
        of one.
      </motion.p>
    </section>
  )
}
