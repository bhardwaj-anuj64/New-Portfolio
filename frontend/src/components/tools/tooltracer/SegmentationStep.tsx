import { RotateCcw } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { PixelPoint } from '../../../types'
import { clickToPixel } from './imageUtils'

interface SegmentationStepProps {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  seeds: PixelPoint[]
  onAddSeed: (point: PixelPoint) => void
  onResetSeeds: () => void
  tolerance: number
  onToleranceChange: (tolerance: number) => void
  maskPreviewDataUrl: string | null
  previewLoading: boolean
  onConfirm: () => void
  confirmLoading: boolean
  error: string | null
}

export function SegmentationControls({
  seeds,
  onResetSeeds,
  tolerance,
  onToleranceChange,
  onConfirm,
  confirmLoading,
  error,
}: SegmentationStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/60">
        Click background points to seed the mask — the paper, and any shadowed gaps between
        tools. Missing a shadow gap is the most common reason two tools appear merged into one.
      </p>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Tolerance ({tolerance})
        <input
          type="range"
          min={1}
          max={80}
          value={tolerance}
          onChange={(e) => onToleranceChange(Number(e.target.value))}
        />
      </label>

      <p className="text-xs text-white/40">{seeds.length} seed{seeds.length === 1 ? '' : 's'} placed.</p>

      <div className="flex gap-2">
        <button
          onClick={onResetSeeds}
          disabled={seeds.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" /> Clear seeds
        </button>
        <button
          onClick={onConfirm}
          disabled={seeds.length === 0 || confirmLoading}
          className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
        >
          {confirmLoading ? 'Finding tools…' : 'Review tools'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function SegmentationPreview({
  imageDataUrl,
  imageWidth,
  imageHeight,
  seeds,
  onAddSeed,
  maskPreviewDataUrl,
  previewLoading,
}: SegmentationStepProps) {
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    onAddSeed(clickToPixel(e, e.currentTarget, imageWidth, imageHeight))
  }

  return (
    <div
      onClick={handleClick}
      className="relative w-full max-w-full cursor-crosshair"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <img src={imageDataUrl} alt="Rectified photo" className="absolute inset-0 h-full w-full object-contain" />
      {maskPreviewDataUrl && (
        // Live foreground-mask overlay, tinted green — this is the "watch it happen" feedback
        // the segmentation live-preview endpoint exists for.
        <img
          src={maskPreviewDataUrl}
          alt="Segmentation mask preview"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-screen"
          style={{ opacity: 0.5, filter: 'sepia(1) saturate(6) hue-rotate(70deg)' }}
        />
      )}
      <svg
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {seeds.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={Math.max(3, imageWidth / 200)} fill="#f97316" />
        ))}
      </svg>
      {previewLoading && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/70">
          Updating…
        </div>
      )}
    </div>
  )
}
