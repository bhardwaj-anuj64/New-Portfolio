import type { PocketTool } from '../../../types'
import { base64ToDataUrl } from './imageUtils'

interface OrganizerStepProps {
  pockets: PocketTool[]
  onDepthChange: (islandId: number, depthMm: number) => void
  blockThicknessMm: number
  onBlockThicknessChange: (mm: number) => void
  padMm: number
  onPadMmChange: (mm: number) => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}

const OUTPUT_TYPES = [
  { id: 'gridfinity', label: 'Gridfinity organizer', available: true },
  { id: 'holder', label: 'Individual holder', available: false },
  { id: 'gcode', label: 'G-code / CNC cutout', available: false },
]

export function OrganizerControls({
  blockThicknessMm,
  onBlockThicknessChange,
  padMm,
  onPadMmChange,
  onConfirm,
  loading,
  error,
}: OrganizerStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50">Output type</span>
        {OUTPUT_TYPES.map((type) => (
          <div
            key={type.id}
            title={type.available ? undefined : 'Coming soon'}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              type.available
                ? 'border-emerald-400/50 bg-emerald-400/10 text-white'
                : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
            }`}
          >
            {type.label}
            {!type.available && <span className="ml-2 text-[10px] uppercase tracking-wide">Coming soon</span>}
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Block thickness ({blockThicknessMm}mm)
        <input
          type="range"
          min={3}
          max={20}
          step={0.5}
          value={blockThicknessMm}
          onChange={(e) => onBlockThicknessChange(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Clearance between pockets ({padMm}mm)
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={padMm}
          onChange={(e) => onPadMmChange(Number(e.target.value))}
        />
      </label>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
      >
        {loading ? 'Building preview…' : 'Preview mesh'}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function OrganizerPreview({ pockets, onDepthChange, blockThicknessMm }: OrganizerStepProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-white/40">
        Pocket depth per tool (must be less than the {blockThicknessMm}mm block thickness):
      </p>
      {pockets.map((pocket) => (
        <div key={pocket.islandId} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
          <img
            src={base64ToDataUrl(pocket.thumbnailPngB64)}
            alt={`Tool ${pocket.islandId}`}
            className="h-10 w-10 rounded bg-black/40 object-contain"
          />
          <span className="flex-1 text-xs text-white/50">{pocket.areaMm2.toFixed(0)} mm²</span>
          <input
            type="number"
            min={0.5}
            max={blockThicknessMm - 0.5}
            step={0.5}
            value={pocket.pocketDepthMm}
            onChange={(e) => onDepthChange(pocket.islandId, Number(e.target.value))}
            className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
            aria-label={`Pocket depth for tool ${pocket.islandId} (mm)`}
          />
        </div>
      ))}
    </div>
  )
}
