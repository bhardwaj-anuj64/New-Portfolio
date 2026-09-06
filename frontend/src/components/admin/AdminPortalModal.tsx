import { AnimatePresence, motion } from 'framer-motion'
import { Box, ExternalLink, LogOut, Server, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { requestAdminChallenge, verifyAdminChallenge } from '../../services/api'
import { useAdminStore } from '../../store/useAdminStore'
import type { ChallengeResponse, DockerContainerStatus, ServerNodeStatus } from '../../types'

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

function ChallengeGate() {
  const setAuthenticated = useAdminStore((s) => s.setAuthenticated)
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadChallenge = useCallback(() => {
    setAnswer('')
    requestAdminChallenge()
      .then(setChallenge)
      .catch(() => setError('Could not reach the gateway.'))
  }, [])

  useEffect(() => {
    loadChallenge()
  }, [loadChallenge])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!challenge || answer === '') return

    setSubmitting(true)
    setError(null)
    try {
      const result = await verifyAdminChallenge(challenge.challengeId, Number(answer))
      if (result.success && result.token) {
        setAuthenticated(result.token)
      } else {
        setError('Incorrect — here\'s another one.')
        loadChallenge()
      }
    } catch {
      setError('Could not reach the gateway.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-white/60">Solve this to unlock the admin portal:</p>
      <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-2xl text-white">
        {challenge?.prompt ?? '…'}
      </p>
      <input
        type="number"
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        autoFocus
        placeholder="Answer"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/30"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !challenge}
        className="self-start rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
      >
        Unlock
      </button>
    </form>
  )
}

function AdminDashboard() {
  const logout = useAdminStore((s) => s.logout)

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
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
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f16] p-6 backdrop-blur-md"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Local Admin Portal</h2>
              <button
                onClick={closeAdmin}
                className="text-white/50 transition-colors hover:text-white"
                aria-label="Close admin portal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isAuthenticated ? <AdminDashboard /> : <ChallengeGate />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
