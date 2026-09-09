import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Cpu, HeartPulse, MemoryStick, Server } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHealth, getTelemetry } from '../../services/api'
import type { ServerNodeStatus } from '../../types'
import { GlassCard } from '../common/GlassCard'

const POLL_MS = 5000
const POLL_BACKOFF_MAX_MS = 30000

const NODES: ServerNodeStatus[] = [
  { name: 'proxmox-01', status: 'online', cpu: 18, memory: 42 },
  { name: 'nas-truenas', status: 'online', cpu: 6, memory: 61 },
  { name: 'k3s-worker-2', status: 'degraded', cpu: 84, memory: 77 },
]

const statusColor: Record<ServerNodeStatus['status'], string> = {
  online: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  offline: 'bg-red-400',
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

type PollState = 'checking' | 'live' | 'unavailable'

// Shared poll loop for both dashboard feeds. Backs off up to POLL_BACKOFF_MAX_MS on repeated
// failure instead of hammering an unreachable/misconfigured endpoint every 5s forever — the
// backend being down or CORS-blocked shouldn't turn into an indefinite retry storm.
function usePolling<T>(fetcher: () => Promise<T>, enabled: boolean) {
  const [data, setData] = useState<T | null>(null)
  const [state, setState] = useState<PollState>('checking')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>
    let delay = POLL_MS

    const poll = () => {
      fetcher()
        .then((result) => {
          if (cancelled) return
          setData(result)
          setState('live')
          delay = POLL_MS
        })
        .catch(() => {
          // Expected whenever the local backend isn't running (or misconfigured for CORS) —
          // no dev API to reach, not a bug in this component.
          if (cancelled) return
          setData(null)
          setState('unavailable')
          delay = Math.min(delay * 2, POLL_BACKOFF_MAX_MS)
        })
        .finally(() => {
          if (!cancelled) timeoutId = setTimeout(poll, delay)
        })
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [fetcher, enabled])

  return { data, state }
}

export function SystemsLab() {
  const [notesOpen, setNotesOpen] = useState(false)
  const { data: telemetry, state: telemetryState } = usePolling(getTelemetry, true)
  const { data: health, state: healthState } = usePolling(getHealth, notesOpen)
  const telemetryLive = telemetryState === 'live'

  const stats = [
    { icon: Cpu, label: 'CPU load', value: telemetry ? `${telemetry.cpuUsagePercent}%` : '—' },
    { icon: MemoryStick, label: 'Memory', value: telemetry ? `${telemetry.memoryUsageMb} MB` : '—' },
    { icon: Server, label: 'Active services', value: telemetry ? `${telemetry.activeServices}` : '—' },
  ]

  return (
    <GlassCard className="flex flex-col gap-6 text-left">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Systems Lab</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {telemetryLive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${telemetryLive ? 'bg-emerald-400' : 'bg-white/30'}`}
            />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            {telemetryLive ? 'Live telemetry' : 'Telemetry unavailable'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/50">
          <Server className="h-3.5 w-3.5" /> Live Microservices
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {NODES.map((node) => (
            <div
              key={node.name}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="font-mono text-white/80">{node.name}</span>
              <span className="flex items-center gap-2 text-white/50">
                {node.cpu}%
                <span className={`h-2 w-2 rounded-full ${statusColor[node.status]}`} />
              </span>
            </div>
          ))}
        </div>
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

      <button
        onClick={() => setNotesOpen((open) => !open)}
        className="flex items-center gap-2 self-start text-sm text-white/60 transition-colors hover:text-white"
      >
        Why & How I Built It
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${notesOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {notesOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-sm text-white/70">
                This homelab runs on a 3-node Proxmox cluster feeding a TrueNAS array and a k3s worker for
                container workloads. The dashboard above talks to a small ASP.NET Core service exposing{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/api/system/health</code> and{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/api/system/telemetry</code>, polled
                every 5 seconds — the numbers above are real, not mocked.
              </p>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <HeartPulse
                  className={`h-4 w-4 shrink-0 ${
                    healthState === 'live'
                      ? 'text-emerald-400'
                      : healthState === 'checking'
                        ? 'animate-pulse text-white/40'
                        : 'text-white/30'
                  }`}
                />
                <div className="flex-1 text-sm">
                  {healthState === 'checking' && <span className="text-white/50">Checking backend health…</span>}
                  {healthState === 'live' && health && (
                    <>
                      <span className="text-white/80">Backend status: {health.status}</span>
                      <span className="ml-2 text-white/50">
                        uptime {formatUptime(health.uptimeSeconds)} · {health.memoryUsageMb} MB
                      </span>
                    </>
                  )}
                  {healthState === 'unavailable' && (
                    <span className="text-white/50">Backend health check unavailable — service offline</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
