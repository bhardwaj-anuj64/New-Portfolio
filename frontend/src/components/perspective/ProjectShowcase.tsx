import { TiltProjectCard } from '../common/TiltProjectCard'
import type { ShowcaseProject } from '../../types'

const PROJECTS: ShowcaseProject[] = [
  {
    title: 'Common SharePoint File Upload Service',
    description:
      'A reusable service for seamless file uploading across enterprise platforms, standardizing document handling.',
    tags: ['C#', '.NET', 'SharePoint API', 'Azure DevOps'],
  },
  {
    title: 'Enterprise Common Library & App Support',
    description:
      'Maintained and expanded shared internal library packages while delivering critical enhancements and ongoing support for legacy enterprise applications.',
    tags: ['C#', 'ASP.NET', '.NET Framework', 'SQL', 'Azure DevOps'],
  },
  {
    title: 'CI/CD Pipeline Automation & Copilot Workflows',
    description:
      'Custom pre-build scripts and Azure DevOps MCP server integrations to optimize CI/CD pipelines and drive standardized developer productivity.',
    tags: ['Azure DevOps', 'GitHub Copilot', 'C#', 'PowerShell'],
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
