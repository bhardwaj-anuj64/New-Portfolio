import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Download, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { useRef } from 'react'
import { DoubleSide, type BufferGeometry } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useElapsedSeconds } from './useElapsedSeconds'

interface MeshPreviewStepProps {
  geometry: BufferGeometry | null
  isWatertight: boolean | null
  wireframe: boolean
  onWireframeChange: (wireframe: boolean) => void
  autoRotate: boolean
  onAutoRotateChange: (autoRotate: boolean) => void
  onExportStl: () => void
  onExportDxf: () => void
  exportingStl: boolean
  loading: boolean
  error: string | null
}

export function MeshPreviewControls({
  isWatertight,
  wireframe,
  onWireframeChange,
  autoRotate,
  onAutoRotateChange,
  onExportStl,
  onExportDxf,
  exportingStl,
  error,
}: MeshPreviewStepProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      {isWatertight === false && (
        <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-300">
          This mesh isn't a closed solid and won't slice correctly. Try adjusting seeds/tolerance
          or pocket depths and preview again.
        </p>
      )}

      <label className="flex items-center justify-between text-xs text-white/50">
        Wireframe
        <input type="checkbox" checked={wireframe} onChange={(e) => onWireframeChange(e.target.checked)} />
      </label>

      <label className="flex items-center justify-between text-xs text-white/50">
        <span className="flex items-center gap-1">
          <RotateCw className="h-3.5 w-3.5" /> Auto-rotate
        </span>
        <input type="checkbox" checked={autoRotate} onChange={(e) => onAutoRotateChange(e.target.checked)} />
      </label>

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={onExportStl}
          disabled={exportingStl || isWatertight === false}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {exportingStl ? 'Preparing…' : 'Export .stl'}
        </button>
        <button
          onClick={onExportDxf}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <Download className="h-4 w-4" /> Export outline .dxf
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

const ZOOM_IN_FACTOR = 0.8
const ZOOM_OUT_FACTOR = 1.25

/** Full-panel "still working" overlay with a running elapsed-time counter — the tools-service
 * runs on a small homelab VM, so a mesh build can take a while and a bare "Building…" label with
 * no sense of how long is indistinguishable from a hang. */
export function BuildingOverlay({ active, label = 'Building mesh…' }: { active: boolean; label?: string }) {
  const seconds = useElapsedSeconds(active)
  if (!active) return null
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-sm text-white">
      <span>{label}</span>
      <span className="text-xs text-white/50">
        {seconds}s elapsed — this runs on a small homelab server, larger images take longer
      </span>
    </div>
  )
}

export function MeshPreviewViewer({ geometry, wireframe, autoRotate, loading }: MeshPreviewStepProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  function zoom(factor: number) {
    const controls = controlsRef.current
    if (!controls) return
    controls.object.position.sub(controls.target).multiplyScalar(factor).add(controls.target)
    controls.update()
  }

  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-lg bg-black/40">
      <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        {geometry && (
          <mesh geometry={geometry}>
            <meshStandardMaterial color="#4ade80" wireframe={wireframe} side={DoubleSide} />
          </mesh>
        )}
        <OrbitControls ref={controlsRef} autoRotate={autoRotate} autoRotateSpeed={2} />
      </Canvas>

      {geometry && (
        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <button
            onClick={() => zoom(ZOOM_IN_FACTOR)}
            aria-label="Zoom in"
            className="rounded-full bg-black/60 p-1.5 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => zoom(ZOOM_OUT_FACTOR)}
            aria-label="Zoom out"
            className="rounded-full bg-black/60 p-1.5 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
      )}

      <BuildingOverlay active={loading} />

      {!geometry && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
          Preview will appear here.
        </div>
      )}
    </div>
  )
}
