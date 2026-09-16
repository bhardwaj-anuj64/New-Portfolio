import { AnimatePresence, motion } from 'framer-motion'
import { Key, Scan, X, type LucideIcon } from 'lucide-react'
import { lazy, Suspense, type ReactElement } from 'react'
import { useLabsStore } from '../../store/useLabsStore'

// three.js + @react-three pull in a large chunk — only fetched once a tool that needs it opens.
const ToolTracer = lazy(() => import('./tooltracer/ToolTracer').then((m) => ({ default: m.ToolTracer })))
const KeychainGenerator = lazy(() =>
  import('./keychain/KeychainGenerator').then((m) => ({ default: m.KeychainGenerator })),
)

const TOOLS: { id: string; label: string; icon: LucideIcon; render: () => ReactElement }[] = [
  { id: 'tooltracer', label: 'Tool Tracer', icon: Scan, render: () => <ToolTracer /> },
  { id: 'keychain', label: 'Keychain Holder', icon: Key, render: () => <KeychainGenerator /> },
]

export function LabsModal() {
  const { isOpen, activeToolId, close, setActiveTool } = useLabsStore()
  const activeTool = TOOLS.find((t) => t.id === activeToolId) ?? TOOLS[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="grid max-h-[90vh] w-full max-w-4xl grid-cols-[200px_1fr] overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f16] backdrop-blur-md"
          >
            <div className="flex flex-col gap-1 border-r border-white/10 p-4">
              <div className="mb-3 flex items-center justify-between px-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Microservice Playground
                </h2>
                <button
                  onClick={close}
                  className="text-white/50 transition-colors hover:text-white"
                  aria-label="Close labs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    tool.id === activeToolId
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <tool.icon className="h-4 w-4 shrink-0" />
                  {tool.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <Suspense
                fallback={
                  <div className="flex h-72 items-center justify-center text-sm text-white/40">
                    Loading tool…
                  </div>
                }
              >
                {activeTool.render()}
              </Suspense>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
