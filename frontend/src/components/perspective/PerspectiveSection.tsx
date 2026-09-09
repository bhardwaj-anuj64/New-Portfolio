import { FadeSection } from '../common/FadeSection'
import { ProfessionalSkills } from './ProfessionalSkills'
import { ProjectShowcase } from './ProjectShowcase'

export function PerspectiveSection() {
  return (
    <FadeSection id="professional" className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
      <h2 className="text-2xl font-semibold text-white">Professional System Architecture</h2>
      <ProfessionalSkills />
      <ProjectShowcase />
    </FadeSection>
  )
}
