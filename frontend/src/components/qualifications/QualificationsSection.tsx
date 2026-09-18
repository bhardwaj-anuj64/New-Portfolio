import { AnimatePresence, motion } from 'framer-motion'
import { Cloud, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { FadeSection } from '../common/FadeSection'
import { GlassCard } from '../common/GlassCard'
import { GlassChevron } from '../common/GlassChevron'
import type { QualificationMilestone } from '../../types'

const MILESTONES: QualificationMilestone[] = [
  {
    id: 'btech-cs',
    type: 'degree',
    title: 'B.Tech in Computer Science',
    institution: 'RIMT University, Mandi Gobindgarh, Punjab',
    date: '2020',
    icon: GraduationCap,
    details: 'Undergraduate degree in Computer Science.',
    skills: ['Computer Science', 'Software Engineering'],
  },
  {
    id: 'ms-cs',
    type: 'degree',
    title: 'M.S. in Computer Science',
    institution: 'University of Florida',
    date: '2023',
    icon: GraduationCap,
    details: 'Graduate degree in Computer Science.',
    skills: ['Computer Science', 'Software Engineering'],
  },
  {
    id: 'az-900',
    type: 'certification',
    title: 'Microsoft Certified: Azure Fundamentals (AZ-900)',
    institution: 'Microsoft',
    date: '2023',
    icon: Cloud,
    details: 'Foundational certification covering core Azure services, pricing, and governance.',
    skills: ['Azure', 'Cloud Fundamentals'],
  },
]

function TimelineItem({ milestone }: { milestone: QualificationMilestone }) {
  const [open, setOpen] = useState(false)
  const Icon = milestone.icon

  return (
    <div className="relative pl-8 sm:pl-10">
      <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-amber-400 bg-[#0a0a0f] shadow-[0_0_12px_2px_rgba(251,191,36,0.5)] sm:left-[3px]" />

      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <GlassCard onClick={() => setOpen((o) => !o)} className="cursor-pointer p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/80">
                  {milestone.type}
                </p>
                <h3 className="text-sm font-medium text-white">{milestone.title}</h3>
                <p className="mt-0.5 text-xs text-white/50">
                  {milestone.institution} · {milestone.date}
                </p>
              </div>
            </div>
            <GlassChevron open={open} className="mt-1 shrink-0" />
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="mt-3 text-sm text-white/70">{milestone.details}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {milestone.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  )
}

export function QualificationsSection() {
  return (
    <FadeSection id="qualifications" className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="text-2xl font-semibold text-white">Qualifications</h2>
      <p className="mt-2 max-w-lg text-white/60">
        Degrees, certifications, and credentials — click any entry for the details.
      </p>

      <div className="relative mt-10 flex flex-col gap-6">
        <div className="absolute bottom-1 left-[7px] top-1 w-px bg-gradient-to-b from-amber-400/70 via-amber-400/20 to-transparent sm:left-[10px]" />
        {MILESTONES.map((milestone) => (
          <TimelineItem key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </FadeSection>
  )
}
