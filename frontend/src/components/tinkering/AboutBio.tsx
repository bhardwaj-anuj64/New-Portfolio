import { Atom, Braces, Code, Compass, Container, Home, Layers, MapPin, Microchip, Sparkle, Workflow } from 'lucide-react'
import { GlassCard } from '../common/GlassCard'

const CORE_STACK = [
  { icon: Code, name: 'C#' },
  { icon: Layers, name: '.NET' },
  { icon: Atom, name: 'React' },
  { icon: Braces, name: 'TypeScript' },
  { icon: Microchip, name: 'ESP32' },
  { icon: Container, name: 'Docker' },
  { icon: Workflow, name: 'Azure DevOps' },
  { icon: Home, name: 'Home Assistant' },
]

export function AboutBio() {
  return (
    <GlassCard className="grid gap-8 text-left sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <MapPin className="h-3 w-3" /> Based in Austin, TX
        </span>
        <h2 className="text-2xl font-semibold text-white">Full-stack engineer, homelab tinkerer</h2>
        <p className="text-sm text-white/60">
          I build full-stack systems end to end — from .NET APIs to React interfaces to the homelab that
          hosts it all. I care about clean architecture as much as I care about a car that starts on the
          first try.
        </p>
        <p className="flex items-center gap-2 text-sm text-emerald-300">
          <Compass className="h-4 w-4 shrink-0" />
          Primary focus: resilient, self-hosted systems and the firmware that talks to them.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            <Sparkle className="h-3.5 w-3.5" /> Recent Engineering Focus
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Most recently: wiring an ESP32 filament dryer controller into Home Assistant over WebSockets,
            and rebuilding this site's CI/CD pipeline for sha-tagged, home-server deploys.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Core Stack</h3>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CORE_STACK.map(({ icon: Icon, name }) => (
              <div
                key={name}
                className="flex flex-col items-center gap-1 rounded-lg border border-white/15 bg-white/10 py-2"
              >
                <Icon className="h-4 w-4 text-white" />
                <span className="text-[10px] font-medium text-white/80">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
