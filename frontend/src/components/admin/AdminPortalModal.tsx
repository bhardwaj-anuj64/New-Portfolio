import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, BellRing, Box, ExternalLink, LogOut, Server, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { generateOtpChallenge, getAnalyticsStats, verifyOtpChallenge } from '../../services/api'
import { registerDevicePush } from '../../services/pushSubscription'
import { useAdminStore } from '../../store/useAdminStore'
import type { AnalyticsStatsResponse, DockerContainerStatus, OtpChallengeResponse, ServerNodeStatus } from '../../types'
import { AdminMatrixCanvas } from './AdminMatrixCanvas'

const NODES: ServerNodeStatus[] = [
  { name: 'proxmox-01', status: 'online', cpu: 18, memory: 42 },
  { name: 'nas-truenas', status: 'online', cpu: 6, memory: 61 },
  { name: 'k3s-worker-2', status: 'degraded', cpu: 84, memory: 77 },
]

const CONTAINERS: DockerContainerStatus[] = [
  { name: 'portfolio-api', status: 'running', uptime: '4d 12h' },
  { name: 'portfolio-web', status: 'running', uptime: '4d 12h' },
  { name: 'postgres', status: 'running', uptime: '11d 3h' },
  { name: 'traefik', status: 'restarting', uptime: '2m' },
]

const dotColor: Record<string, string> = {
  online: 'bg-emerald-400',
  running: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  restarting: 'bg-amber-400',
  offline: 'bg-red-400',
  stopped: 'bg-red-400',
}

type DispatchStatus = 'idle' | 'dispatching' | 'success' | 'error'

function OtpGate() {
  const setAuthenticated = useAdminStore((s) => s.setAuthenticated)
  const [challenge, setChallenge] = useState<OtpChallengeResponse | null>(null)
  const [linkError, setLinkError] = useState(false)
  const [code, setCode] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [dispatch, setDispatch] = useState<DispatchStatus>('idle')
  const [shake, setShake] = useState(false)

  const loadChallenge = useCallback(() => {
    setCode('')
    setDispatch('idle')
    setLinkError(false)
    setChallenge(null)
    generateOtpChallenge()
      .then(setChallenge)
      .catch(() => setLinkError(true))
  }, [])

  useEffect(() => {
    loadChallenge()
  }, [loadChallenge])

  useEffect(() => {
    if (!challenge) return

    const tick = () => {
      const secs = Math.max(0, Math.round((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000))
      setRemaining(secs)
      if (secs === 0 && dispatch !== 'dispatching') {
        loadChallenge() // TTL hit — reissue automatically rather than dead-ending the terminal
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [challenge, dispatch, loadChallenge])

  async function submit(fullCode: string) {
    if (!challenge) return
    setDispatch('dispatching')
    try {
      const result = await verifyOtpChallenge(challenge.challengeId, fullCode)
      if (result.success && result.token) {
        setDispatch('success')
        // Hold on the ACK line briefly so the rain has time to shift to green before the
        // dashboard view takes over.
        setTimeout(() => setAuthenticated(result.token!), 600)
      } else {
        setDispatch('error')
        setShake(true)
        setTimeout(() => setShake(false), 450)
        loadChallenge()
      }
    } catch {
      setDispatch('error')
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6 && dispatch === 'idle') {
      void submit(digits)
    }
  }

  if (linkError) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm text-red-400">&gt; ERROR — GATEWAY UNREACHABLE.</p>
        <button
          onClick={loadChallenge}
          className="self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white transition-colors hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    )
  }

  const locked = dispatch === 'dispatching' || dispatch === 'success' || !challenge

  return (
    <motion.div
      animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-white/60">
        {challenge ? 'Enter the 6-digit Level 5 access code.' : 'Requesting challenge...'}
      </p>

      <input
        type="text"
        inputMode="numeric"
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        disabled={locked}
        autoFocus
        placeholder="------"
        maxLength={6}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center font-mono text-3xl tracking-[0.75em] text-white outline-none transition-colors focus:border-emerald-400/50 disabled:opacity-60"
      />

      {challenge && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{challenge.deliveryMethod === 'push' ? 'Dispatched via push' : 'Check server console (dev fallback)'}</span>
          <span className={`font-mono ${remaining <= 10 ? 'animate-pulse text-red-400' : ''}`}>
            {String(remaining).padStart(2, '0')}s
          </span>
        </div>
      )}

      {dispatch !== 'idle' && (
        <div className="rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs text-white/70">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            &gt; REQUESTING VAPID DISPATCH...
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            &gt; VERIFYING CHALLENGE TOKEN...
          </motion.p>
          {dispatch === 'success' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-emerald-300"
            >
              &gt; ACK 200 — ACCESS GRANTED.
            </motion.p>
          )}
          {dispatch === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-red-400"
            >
              &gt; ACK 401 — CHALLENGE REJECTED.
            </motion.p>
          )}
        </div>
      )}
    </motion.div>
  )
}

function SiteAnalytics() {
  const token = useAdminStore((s) => s.token)
  const [stats, setStats] = useState<AnalyticsStatsResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    getAnalyticsStats(token)
      .then(setStats)
      .catch(() => setFailed(true))
  }, [token])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/50">
        <BarChart3 className="h-3.5 w-3.5" /> Site Analytics
      </h3>
      {failed && <p className="text-xs text-red-400">Could not load analytics.</p>}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-2xl font-semibold text-white">{stats.pageViews}</p>
              <p className="text-xs text-white/50">Page views</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-2xl font-semibold text-white">{stats.resumeDownloads}</p>
              <p className="text-xs text-white/50">Resume downloads</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-white/40">Recent errors</span>
            {stats.recentErrors.length === 0 ? (
              <p className="text-xs text-white/40">None recorded.</p>
            ) : (
              stats.recentErrors.slice(0, 5).map((error, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                  <p className="truncate text-red-400">{error.message}</p>
                  <p className="text-white/30">{new Date(error.timestamp).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AdminDashboard() {
  const logout = useAdminStore((s) => s.logout)
  const token = useAdminStore((s) => s.token)
  const [registering, setRegistering] = useState(false)
  const [pushStatus, setPushStatus] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleRegisterPush() {
    if (!token) return
    setRegistering(true)
    setPushStatus(null)
    try {
      setPushStatus(await registerDevicePush(token))
    } catch (err) {
      setPushStatus({ ok: false, message: err instanceof Error ? err.message : 'Registration failed.' })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <>
      <SiteAnalytics />

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/50">
            <Server className="h-3.5 w-3.5" /> Server Nodes
          </h3>
          {NODES.map((node) => (
            <div
              key={node.name}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="font-mono text-white/80">{node.name}</span>
              <span className="flex items-center gap-2 text-white/50">
                {node.cpu}% cpu
                <span className={`h-2 w-2 rounded-full ${dotColor[node.status]}`} />
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/50">
            <Box className="h-3.5 w-3.5" /> Docker Containers
          </h3>
          {CONTAINERS.map((container) => (
            <div
              key={container.name}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="font-mono text-white/80">{container.name}</span>
              <span className="flex items-center gap-2 text-white/50">
                {container.uptime}
                <span className={`h-2 w-2 rounded-full ${dotColor[container.status]}`} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/50">
            <BellRing className="h-3.5 w-3.5" /> Push OTP Delivery
          </span>
          <button
            onClick={handleRegisterPush}
            disabled={registering}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {registering ? 'Registering…' : 'Enable on this device'}
          </button>
        </div>
        {pushStatus && (
          <p className={`text-xs ${pushStatus.ok ? 'text-emerald-300' : 'text-red-400'}`}>{pushStatus.message}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <a
          href="#"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          Home Assistant dashboard <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </>
  )
}

export function AdminPortalModal() {
  const { isAdminOpen, isAuthenticated, closeAdmin } = useAdminStore()

  return (
    <AnimatePresence>
      {isAdminOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeAdmin}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f16]"
          >
            <AdminMatrixCanvas colorPhase={isAuthenticated ? 'green' : 'red'} />

            <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0f0f16]/75 px-6 py-4 backdrop-blur-sm">
              <h2 className="font-mono text-lg font-semibold text-white">Level 5 Access Terminal</h2>
              <button
                onClick={closeAdmin}
                className="text-white/50 transition-colors hover:text-white"
                aria-label="Close admin portal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative z-10 overflow-y-auto bg-[#0f0f16]/75 p-6 backdrop-blur-sm">
              {isAuthenticated ? <AdminDashboard /> : <OtpGate />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
