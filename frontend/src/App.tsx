import { lazy, Suspense } from 'react'
import { AboutSection } from './components/about/AboutSection'
import { AdminPortalModal } from './components/admin/AdminPortalModal'
import { Hero } from './components/hero/Hero'
import { PerspectiveSection } from './components/perspective/PerspectiveSection'
import { DxfTool } from './components/tools/DxfTool'
import { useAdminStore, useAdminShortcut } from './store/useAdminStore'

// three.js + @react-three pull in a large chunk — split it out of the critical path
// since the mesh tool is an optional, below-the-fold extra.
const Mesh3DTool = lazy(() =>
  import('./components/tools/Mesh3DTool').then((m) => ({ default: m.Mesh3DTool })),
)

function App() {
  useAdminShortcut()
  const openAdmin = useAdminStore((s) => s.openAdmin)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Hero />
      <AboutSection />
      <PerspectiveSection />

      <section id="tools" className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
        <DxfTool />
        <Suspense
          fallback={
            <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40">
              Loading 3D viewer…
            </div>
          }
        >
          <Mesh3DTool />
        </Suspense>
      </section>

      <footer className="flex items-center justify-center gap-2 border-t border-white/10 px-6 py-6 text-xs text-white/40">
        <span
          onDoubleClick={openAdmin}
          className="flex cursor-default items-center gap-2 select-none"
          title="Double-click for admin portal"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          All systems operational
        </span>
      </footer>

      <AdminPortalModal />
    </div>
  )
}

export default App
