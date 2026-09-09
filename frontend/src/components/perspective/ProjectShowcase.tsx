import { TiltProjectCard } from '../common/TiltProjectCard'
import type { ShowcaseProject } from '../../types'

const PROJECTS: ShowcaseProject[] = [
  {
    title: 'Claims Processing Platform',
    description:
      'A .NET 8 microservice suite that automated manual insurance claims intake, cutting average processing time from 3 days to under 4 hours.',
    tags: ['.NET 8', 'SQL Server', 'Azure DevOps'],
    repoUrl: '#',
    demoUrl: '#',
  },
  {
    title: 'Inventory Sync Service',
    description:
      'A MySQL-backed reconciliation service keeping warehouse and storefront inventory in lockstep across 40+ retail locations.',
    tags: ['C#', 'MySQL', 'CI/CD'],
    repoUrl: '#',
    demoUrl: '#',
  },
  {
    title: 'Internal Deploy Console',
    description:
      'A self-service release dashboard wrapping Azure DevOps pipelines, giving non-engineers a safe one-click path to production.',
    tags: ['.NET', 'Azure DevOps', 'GitHub Copilot'],
    repoUrl: '#',
    demoUrl: '#',
  },
]

export function ProjectShowcase() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PROJECTS.map((project) => (
        <TiltProjectCard key={project.title} project={project} />
      ))}
    </div>
  )
}
