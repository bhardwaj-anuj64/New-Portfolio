import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Code, Database, Layers, Sparkles, Terminal, Workflow, X } from 'lucide-react'
import { useState } from 'react'
import { GravityMeshCanvas } from './GravityMeshCanvas'
import type { EnterpriseSkill } from '../../types'

const SKILLS: EnterpriseSkill[] = [
  {
    icon: Code,
    name: 'C#',
    impact:
      'Built reusable enterprise services like the Common SharePoint File Upload Service, standardizing document handling across platforms.',
  },
  {
    icon: Layers,
    name: '.NET',
    impact:
      'Maintains and expands shared internal library packages while delivering ongoing support for legacy enterprise applications.',
  },
  {
    icon: Database,
    name: 'SQL',
    impact: 'Works with relational databases backing enterprise applications and internal tools.',
  },
  {
    icon: Sparkles,
    name: 'GitHub Copilot',
    impact: 'Set standards for Copilot usage across enterprise development workflows.',
  },
  {
    icon: Workflow,
    name: 'Azure DevOps (CI/CD)',
    impact:
      'Built custom pre-build scripts and Azure DevOps MCP server integrations to optimize CI/CD pipelines.',
  },
  {
    icon: Terminal,
    name: 'PowerShell',
    impact: 'Automates build pipelines and developer tooling to drive standardized developer productivity.',
  },
]

function SkillCard({
  skill,
  isSelected,
  onClick,
}: {
  skill: EnterpriseSkill
  isSelected: boolean
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isActive = isHovered || isSelected
  const Icon = skill.icon

  return (
    <motion.div
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-6 text-center shadow-lg backdrop-blur-md transition-colors ${
        isActive ? 'border-violet-400/50 bg-white/10 shadow-black/40' : 'border-white/10 bg-white/5 shadow-black/20'
      }`}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <GravityMeshCanvas spacing={16} influenceRadius={70} pullStrength={10} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <Icon className="h-5 w-5 text-white/70" />
        <span className="text-sm font-medium text-white">{skill.name}</span>
      </div>

      <ChevronDown
        className={`absolute right-2.5 top-2.5 z-10 h-3 w-3 text-white/40 transition-all duration-300 ${
          isActive ? 'opacity-70' : 'opacity-20'
        } ${isSelected ? 'rotate-180' : ''}`}
      />
    </motion.div>
  )
}

export function ProfessionalSkills() {
  const [activeName, setActiveName] = useState<string | null>(null)
  const active = SKILLS.find((s) => s.name === activeName) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SKILLS.map((skill) => (
          <SkillCard
            key={skill.name}
            skill={skill}
            isSelected={activeName === skill.name}
            onClick={() => setActiveName((current) => (current === skill.name ? null : skill.name))}
          />
        ))}
      </div>

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
              <active.icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                  Impact & Achievement
                </p>
                <p className="mt-1 text-sm text-white/70">{active.impact}</p>
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
