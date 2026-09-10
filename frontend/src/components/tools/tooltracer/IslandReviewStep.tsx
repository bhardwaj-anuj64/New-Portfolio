import type { IslandOut } from '../../../types'
import { base64ToDataUrl } from './imageUtils'

interface IslandReviewStepProps {
  islands: IslandOut[]
  includedIds: Set<number>
  onToggle: (id: number) => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}

export function IslandReviewControls({ islands, includedIds, onConfirm, loading, error }: IslandReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/60">
        Tap any blob that isn't actually a tool — dust specks or shadow fragments sometimes
        clear the size filter — to exclude it.
      </p>
      <p className="text-xs text-white/40">
        {includedIds.size} of {islands.length} included.
      </p>
      <button
        onClick={onConfirm}
        disabled={includedIds.size === 0 || loading}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
      >
        Continue
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function IslandReviewPreview({ islands, includedIds, onToggle }: IslandReviewStepProps) {
  if (islands.length === 0) {
    return <p className="text-sm text-white/40">No tools found — try adding more seed points or raising tolerance.</p>
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {islands.map((island) => {
        const included = includedIds.has(island.id)
        return (
          <button
            key={island.id}
            onClick={() => onToggle(island.id)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
              included ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/10 bg-white/5 opacity-40'
            }`}
          >
            <img
              src={base64ToDataUrl(island.thumbnail_png_b64)}
              alt={`Tool candidate ${island.id}`}
              className="h-16 w-16 rounded bg-black/40 object-contain"
            />
            <span className="text-[10px] text-white/60">{island.area_mm2.toFixed(0)} mm²</span>
          </button>
        )
      })}
    </div>
  )
}
