import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban,
  Boxes,
  ChevronDown,
  CircuitBoard,
  Container,
  Cpu,
  HardDrive,
  Home,
  Layers,
  Microchip,
  Printer,
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
        name: 'C++/Arduino',
        notes: 'Firmware for the split-flap display\'s ESP32, driving message rendering, countdowns, and real-time clock sync.',
      },
      {
        icon: CircuitBoard,
        name: 'Custom PCB/Mechanics',
        notes: 'Designed the driver board and mechanical assembly for the split-flap display from scratch.',
      },
      {
        icon: Waves,
        name: 'WebSockets',
        notes: 'Wi-Fi-connected devices pushing live state to the browser over WebSockets instead of polling REST.',
      },
    ],
  },
  {
    title: '3D Printing & CAD',
    skills: [
      {
        icon: Boxes,
        name: 'Onshape CAD',
        notes: 'Parametric design for functional, practical parts rather than decorative novelties.',
      },
      {
        icon: Layers,
        name: 'Orca Slicer',
        notes: 'Slicing and print profiles for technical FDM materials.',
      },
      {
        icon: Printer,
        name: 'FDM Printing',
        notes: 'End-to-end manufacturing in technical materials like PAHT-CF and nylon — including functional interior parts installed on an E46 project vehicle.',
      },
    ],
  },
  {
    title: 'Home Lab & Self-Hosted',
    skills: [
      {
        icon: Container,
        name: 'Docker',
        notes: 'Every self-hosted service runs in a container on the homelab server.',
      },
      {
        icon: Home,
        name: 'Home Assistant',
        notes: 'Smart home automation hub as part of the self-hosted infrastructure.',
      },
      {
        icon: Ban,
        name: 'Pi-hole',
        notes: 'Network-wide ad and tracker blocking at the DNS layer.',
      },
      {
        icon: HardDrive,
        name: 'UGREEN NASync (UGOS)',
        notes: 'Local network storage for the homelab.',
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
