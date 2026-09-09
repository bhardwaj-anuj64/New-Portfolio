import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban,
  Boxes,
  ChevronDown,
  Container,
  Cpu,
  HardDrive,
  Home,
  Layers,
  Microchip,
  Printer,
  Settings2,
  Waves,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { GlassCard } from '../common/GlassCard'
import type { TinkeringSkill, TinkeringSkillGroup } from '../../types'

const GROUPS: TinkeringSkillGroup[] = [
  {
    title: 'Embedded Systems & Firmware',
    skills: [
      {
        icon: Microchip,
        name: 'ESP32',
        notes: 'Dual-core firmware for sensor nodes, streaming readings over WebSockets instead of polling REST.',
      },
      {
        icon: Cpu,
        name: 'Arduino',
        notes: 'Prototyping layer for anything that needs an interrupt handled before the ESP32 build is worth it.',
      },
      {
        icon: Settings2,
        name: 'TMC2209 Drivers',
        notes: 'Tuned StealthChop/SpreadCycle thresholds and sense-resistor current limits to quiet a CoreXY build.',
      },
      {
        icon: Waves,
        name: 'I2C/WebSockets',
        notes: 'Bus-level sensor fan-in over I2C, bridged to the browser over a WebSocket for live dashboards.',
      },
    ],
  },
  {
    title: '3D Printing & CAD',
    skills: [
      {
        icon: Boxes,
        name: 'Onshape CAD',
        notes: 'Parametric assemblies for printer mods, versioned in the browser so no file ever gets lost to a dead laptop.',
      },
      {
        icon: Layers,
        name: 'Orca Slicer',
        notes: 'Tuned pressure advance and per-part cooling profiles to cut warping on ABS enclosures.',
      },
      {
        icon: Printer,
        name: 'FDM/Resin Printing',
        notes: 'FDM for structural parts, resin for anything that needs fine detail — enclosures, connectors, brackets.',
      },
    ],
  },
  {
    title: 'Home Lab & Self-Hosted',
    skills: [
      {
        icon: Container,
        name: 'Docker',
        notes: 'Every self-hosted service runs in a container with a pinned tag — no more "works on my machine" homelab drift.',
      },
      {
        icon: Home,
        name: 'Home Assistant',
        notes: 'Central automation hub tying ESP32 sensors, smart plugs, and the 3D printer farm into one dashboard.',
      },
      {
        icon: Ban,
        name: 'Pi-hole',
        notes: 'Network-wide ad and tracker blocking at the DNS layer, running redundant across two Raspberry Pis.',
      },
      {
        icon: HardDrive,
        name: 'NAS',
        notes: 'TrueNAS array backing every VM snapshot, timelapse, and STL — RAIDZ2 so one drive failure is a non-event.',
      },
    ],
  },
]

function SkillChip({
  skill,
  isSelected,
  onClick,
}: {
  skill: TinkeringSkill
  isSelected: boolean
  onClick: () => void
}) {
  const Icon = skill.icon
  return (
    <GlassCard
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col items-center gap-2 text-center ${
        isSelected ? 'ring-2 ring-emerald-400/60' : ''
      }`}
    >
      <ChevronDown
        className={`absolute right-2.5 top-2.5 h-3 w-3 text-white/40 opacity-20 transition-all duration-300 group-hover:opacity-70 ${
          isSelected ? 'rotate-180 opacity-70' : ''
        }`}
      />
      <Icon className="h-5 w-5 text-white/70" />
      <span className="text-sm font-medium text-white">{skill.name}</span>
    </GlassCard>
  )
}

export function TinkeringSkills() {
  const [activeName, setActiveName] = useState<string | null>(null)
  const active = GROUPS.flatMap((g) => g.skills).find((s) => s.name === activeName) ?? null

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{group.title}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {group.skills.map((skill) => (
              <SkillChip
                key={skill.name}
                skill={skill}
                isSelected={activeName === skill.name}
                onClick={() => setActiveName((current) => (current === skill.name ? null : skill.name))}
              />
            ))}
          </div>
        </div>
      ))}

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.name}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <active.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Build Notes & Spec Sheet
                </p>
                <p className="mt-1 text-sm text-white/70">{active.notes}</p>
              </div>
              <button
                onClick={() => setActiveName(null)}
                aria-label="Close"
                className="text-white/40 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
