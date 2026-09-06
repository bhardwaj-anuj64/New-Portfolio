import { AnimatePresence, motion } from 'framer-motion'
import { SegmentedControl } from '../common/SegmentedControl'
import { usePerspectiveStore } from '../../store/usePerspectiveStore'
import { ProfessionalView } from './ProfessionalView'
import { TinkererView } from './TinkererView'
import type { Perspective } from '../../types'

const OPTIONS = [
  { label: 'Professional System Architecture', value: 'professional' },
  { label: 'Interactive Tinkerer Lab', value: 'tinkerer' },
]

export function PerspectiveSection() {
  const { perspective, setPerspective } = usePerspectiveStore()

  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-16">
      <SegmentedControl
        options={OPTIONS}
        value={perspective}
        onChange={(value) => setPerspective(value as Perspective)}
      />

      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={perspective}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {perspective === 'professional' ? <ProfessionalView /> : <TinkererView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
