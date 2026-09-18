import { TiltProjectCard } from '../common/TiltProjectCard'
import type { ShowcaseProject } from '../../types'

const PROJECTS: ShowcaseProject[] = [
  {
    title: 'Home Infrastructure & IoT Automation Hub',
    description:
      'Self-hosted containerized server infrastructure managing network-wide ad blocking via Pi-hole, smart home automation with Home Assistant, and local network storage.',
    tags: ['Docker', 'Home Assistant', 'Pi-hole', 'UGREEN NASync (UGOS)', 'Linux'],
    repoUrl: 'https://github.com/bhardwaj-anuj64/New-Portfolio',
  },
  {
    title: 'Real-Time ESP32 Split-Flap Display',
    description:
      'Wi-Fi-connected split-flap display driven by an ESP32 using WebSockets for dynamic message rendering, countdowns, and real-time clock synchronization.',
    tags: ['ESP32', 'C++/Arduino', 'WebSockets', 'HTML/CSS/JS', 'Custom PCB'],
  },
  {
    title: 'Practical CAD & Technical 3D Printing Pipeline',
    description:
      'End-to-end design and manufacturing of practical, functional components — including custom interior parts installed and in use on an E46 project vehicle.',
    tags: ['Onshape CAD', 'Orca Slicer', 'FDM 3D Printing', 'PAHT-CF', 'Nylon'],
    repoUrl: 'https://github.com/bhardwaj-anuj64/portfolio-microservices',
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
