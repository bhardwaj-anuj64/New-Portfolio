import { TiltProjectCard } from '../common/TiltProjectCard'
import type { ShowcaseProject } from '../../types'

const PROJECTS: ShowcaseProject[] = [
  {
    title: 'ESP32 Filament Dryer Controller',
    description:
      'A closed-loop dryer built around an ESP32, a PID-tuned heater, and a WebSocket dashboard for live humidity/temp readouts.',
    tags: ['ESP32', 'I2C', 'WebSockets'],
    repoUrl: '#',
    demoUrl: '#',
  },
  {
    title: 'Home Assistant Relay Board',
    description:
      'A custom relay PCB that brings three dumb circuits in the garage under Home Assistant, replacing a tangle of smart plugs.',
    tags: ['KiCad', 'Home Assistant', 'Docker'],
    repoUrl: '#',
    demoUrl: '#',
  },
  {
    title: 'CoreXY 3D Printer Build',
    description:
      'A from-scratch CoreXY frame with TMC2209 drivers tuned for near-silent operation, designed and iterated in Onshape.',
    tags: ['Onshape', 'TMC2209', 'FDM'],
    repoUrl: '#',
    demoUrl: '#',
  },
]

export function MakerProjects() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PROJECTS.map((project) => (
        <TiltProjectCard key={project.title} project={project} />
      ))}
    </div>
  )
}
