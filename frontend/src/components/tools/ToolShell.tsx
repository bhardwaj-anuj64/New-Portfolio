import { Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import type { ToolShellProps } from '../../types'

export function ToolShell({ title, leftPane, rightPane }: ToolShellProps) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md ${
        fullscreen ? 'fixed inset-4 z-50' : 'relative'
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <button
          onClick={() => setFullscreen((f) => !f)}
          className="text-white/50 transition-colors hover:text-white"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className={`grid gap-px bg-white/10 sm:grid-cols-[minmax(0,280px)_1fr] ${fullscreen ? 'h-[calc(100%-49px)]' : ''}`}>
        <div className="flex flex-col gap-4 bg-[#0a0a0f] p-5">{leftPane}</div>
        <div className="min-h-[320px] bg-[#0a0a0f] p-5">{rightPane}</div>
      </div>
    </div>
  )
}
