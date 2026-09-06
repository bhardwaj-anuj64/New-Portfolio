import { Cpu, MemoryStick, Server } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getTelemetry } from '../../services/api'
import type { TelemetryResponse } from '../../types'
import { GlassCard } from '../common/GlassCard'

const POLL_INTERVAL_MS = 5000

export function TelemetryWidget() {
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      getTelemetry()
        .then((data) => {
          if (!cancelled) {
            setTelemetry(data)
            setIsLive(true)
          }
        })
        .catch(() => {
          if (!cancelled) setIsLive(false)
        })
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const stats = [
    { icon: Cpu, label: 'CPU load', value: telemetry ? `${telemetry.cpuUsagePercent}%` : '—' },
    {
      icon: MemoryStick,
      label: 'Memory',
      value: telemetry ? `${telemetry.memoryUsageMb} MB` : '—',
    },
    {
      icon: Server,
      label: 'Active services',
      value: telemetry ? `${telemetry.activeServices}` : '—',
    },
  ]

  return (
    <GlassCard className="flex flex-col gap-4 text-left">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isLive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-white/30'}`}
          />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-white/50">
          {isLive ? 'Live telemetry' : 'Telemetry unavailable'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <Icon className="h-4 w-4 text-white/40" />
            <span className="text-lg font-semibold text-white">{value}</span>
            <span className="text-xs text-white/50">{label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
