import { FadeSection } from '../common/FadeSection'

export function WelcomeSection() {
  return (
    <FadeSection id="welcome" className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16 text-center">
      <h2 className="text-2xl font-semibold text-white">Welcome to my world!</h2>
      <p className="text-white/70">
        I'm a developer and tinkerer who loves building software, crafting custom hardware, and
        bringing random ideas to life through 3D printing. This site is my playground for
        showcasing what I'm working on.
      </p>
      <p className="text-white/70">
        Take a look around, dig into the projects, and reach out if something catches your eye —
        or just to connect. Have fun!
      </p>
    </FadeSection>
  )
}
