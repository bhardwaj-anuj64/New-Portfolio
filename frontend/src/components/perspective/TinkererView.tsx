import { ExternalLink, Home, Server, Wrench } from 'lucide-react'
import { GlassCard } from '../common/GlassCard'
import type { ServerNodeStatus } from '../../types'

const NODES: ServerNodeStatus[] = [
  { name: 'proxmox-01', status: 'online', cpu: 18, memory: 42 },
  { name: 'nas-truenas', status: 'online', cpu: 6, memory: 61 },
  { name: 'k3s-worker-2', status: 'degraded', cpu: 84, memory: 77 },
]

const TOOLS = [
  { icon: Wrench, name: 'Interactive Lab Tools', href: '#tools' },
  { icon: Home, name: 'Home Assistant', href: '#' },
]

const statusColor: Record<ServerNodeStatus['status'], string> = {
  online: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  offline: 'bg-red-400',
}

export function TinkererView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {NODES.map((node) => (
          <GlassCard key={node.name} className="flex flex-col gap-3 text-left">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-white/60" />
              <span className="font-mono text-sm text-white">{node.name}</span>
              <span className={`ml-auto h-2 w-2 rounded-full ${statusColor[node.status]}`} />
            </div>
            <div className="flex gap-4 text-xs text-white/50">
              <span>CPU {node.cpu}%</span>
              <span>MEM {node.memory}%</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {TOOLS.map(({ icon: Icon, name, href }) => (
          <a
            key={name}
            href={href}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-md transition-colors hover:bg-white/10"
          >
            <Icon className="h-4 w-4" />
            {name}
            <ExternalLink className="h-3 w-3 text-white/40" />
          </a>
        ))}
      </div>
    </div>
  )
}
