import { ChevronDown } from 'lucide-react'

interface GlassChevronProps {
  open: boolean
  className?: string
}

export function GlassChevron({ open, className = '' }: GlassChevronProps) {
  return (
    <ChevronDown
      className={`h-3 w-3 text-white/40 transition-all duration-300 ${
        open ? 'rotate-180 opacity-70' : 'opacity-20'
      } ${className}`}
    />
  )
}
