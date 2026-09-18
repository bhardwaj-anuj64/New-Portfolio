import { motion, useSpring } from 'framer-motion'
import { ExternalLink, GitBranch } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { ShowcaseProject } from '../../types'

export function TiltProjectCard({ project }: { project: ShowcaseProject }) {
  const rotateX = useSpring(0, { stiffness: 300, damping: 20 })
  const rotateY = useSpring(0, { stiffness: 300, damping: 20 })

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * 12)
    rotateX.set(py * -12)
  }

  function handleMouseLeave() {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-lg shadow-black/20 backdrop-blur-md"
    >
      <h3 className="font-medium text-white">{project.title}</h3>
      <p className="text-sm text-white/60">{project.description}</p>
      <div className="flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/60"
          >
            {tag}
          </span>
        ))}
      </div>
      {(project.repoUrl || project.demoUrl) && (
        <div className="mt-1 flex gap-4 text-sm text-white/70">
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <GitBranch className="h-4 w-4" /> Repo
            </a>
          )}
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <ExternalLink className="h-4 w-4" /> Live Demo
            </a>
          )}
        </div>
      )}
    </motion.div>
  )
}
