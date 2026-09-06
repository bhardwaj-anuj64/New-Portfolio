import { motion } from 'framer-motion'
import type { SegmentedControlProps } from '../../types'

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative z-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active ? 'text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId="segmented-control-highlight"
                className="absolute inset-0 -z-10 rounded-full bg-white"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
