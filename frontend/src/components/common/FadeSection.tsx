import { motion } from 'framer-motion'
import { useRef, type ReactNode } from 'react'
import { useInView } from '../../hooks/useInView'

interface FadeSectionProps {
  id: string
  className?: string
  children: ReactNode
}

// Shared shell for every scroll-snapped section below the hero: fades/slides in as it
// crosses into the central ~70% of the viewport, and back out as it leaves — paired with
// snap-start (see index.css) so sections read as discrete "pages" rather than one long scroll.
export function FadeSection({ id, className = '', children }: FadeSectionProps) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, '-15% 0px -15% 0px', 0)

  return (
    <motion.section
      id={id}
      ref={ref}
      className={`snap-start ${className}`}
      animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 24 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}
