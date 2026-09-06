import { CloudCog, Download, ServerCog, ShieldCheck } from 'lucide-react'
import { GlassCard } from '../common/GlassCard'
import type { FeatureCardData } from '../../types'

const FEATURES: FeatureCardData[] = [
  {
    icon: ServerCog,
    title: 'Enterprise .NET Architecture',
    description:
      'Structured REST APIs on .NET 8/9 with clean separation of concerns, dependency injection, and strong typing throughout.',
  },
  {
    icon: ShieldCheck,
    title: 'API Resilience',
    description:
      'Input validation, sanitization, and secure CORS policy baked into every endpoint — designed to fail safely under load or attack.',
  },
  {
    icon: CloudCog,
    title: 'CI/CD Pipelines',
    description:
      'Containerized builds via Docker Compose with automated pipelines from commit to deploy, keeping environments reproducible.',
  },
]

export function ProfessionalView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <GlassCard key={title} className="flex flex-col gap-3 text-left">
            <Icon className="h-5 w-5 text-white/70" />
            <h3 className="font-medium text-white">{title}</h3>
            <p className="text-sm text-white/60">{description}</p>
          </GlassCard>
        ))}
      </div>

      <a
        href="/resume.pdf"
        download
        className="inline-flex w-fit items-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
      >
        <Download className="h-4 w-4" />
        Download Resume
      </a>
    </div>
  )
}
