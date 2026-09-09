import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NAV_ITEMS } from '../nav/navItems'
import { getHealth } from '../../services/api'
import type { NavItem } from '../../types'

function useLocalClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function goTo(item: NavItem) {
  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const STATUS_STYLES = {
  checking: { dot: 'bg-white/30', label: 'Checking systems…' },
  online: { dot: 'bg-emerald-400', label: 'All systems operational' },
  offline: { dot: 'bg-red-400', label: 'Gateway unreachable' },
} as const

export function Footer() {
  const now = useLocalClock()
  const [status, setStatus] = useState<keyof typeof STATUS_STYLES>('checking')

  useEffect(() => {
    let cancelled = false
    getHealth()
      .then(() => !cancelled && setStatus('online'))
      .catch(() => !cancelled && setStatus('offline'))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-5 text-xs text-white/50 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[status].dot}`} />
          {STATUS_STYLES[status].label}
          <span className="text-white/20">·</span>
          <span className="font-mono">
            LOCAL {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => goTo(item)}
              className="rounded-full px-3 py-1 transition-colors hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <a
          href="#admin"
          title="Encrypted channel → /admin"
          className="flex items-center gap-1.5 text-white/25 transition-colors hover:text-white/60"
        >
          <Lock className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px]">/admin</span>
        </a>
      </div>
    </footer>
  )
}
