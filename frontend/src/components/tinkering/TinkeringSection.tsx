import { FlaskConical } from 'lucide-react'
import { AboutBio } from './AboutBio'
import { CircuitCanvasBackground } from './CircuitCanvasBackground'
import { MakerProjects } from './MakerProjects'
import { SystemsLab } from './SystemsLab'
import { TinkeringSkills } from './TinkeringSkills'
import { FadeSection } from '../common/FadeSection'
import { useLabsStore } from '../../store/useLabsStore'

export function TinkeringSection() {
  const openLabs = useLabsStore((s) => s.open)

  return (
    <FadeSection id="tinkering" className="relative mx-auto max-w-5xl px-6 py-16">
      <CircuitCanvasBackground />

      <div className="pointer-events-none relative z-10 flex flex-col gap-10">
        <h2 className="pointer-events-auto text-2xl font-semibold text-white">Personal Tinkering Lab</h2>

        <div className="pointer-events-auto">
          <AboutBio />
        </div>

        <div className="pointer-events-auto">
          <TinkeringSkills />
        </div>

        <div className="pointer-events-auto">
          <SystemsLab />
        </div>

        <div className="pointer-events-auto">
          <MakerProjects />
        </div>

        <div className="pointer-events-auto flex justify-center">
          <button
            onClick={() => openLabs()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
          >
            <FlaskConical className="h-4 w-4 text-purple-300" />
            Open the Microservice Playground
          </button>
        </div>
      </div>
    </FadeSection>
  )
}
