import { TelemetryWidget } from './TelemetryWidget'

export function AboutSection() {
  return (
    <section className="mx-auto grid max-w-4xl gap-8 px-6 py-16 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-white">About</h2>
        <p className="text-white/60">
          I build full-stack systems end to end — from .NET APIs to React
          interfaces to the homelab that hosts it all. I care about clean
          architecture as much as I care about a car that starts on the first
          try.
        </p>
      </div>
      <TelemetryWidget />
    </section>
  )
}
