import { RotateCcw } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { PixelPoint } from '../../../types'
import { clickToPixel } from './imageUtils'

const CORNER_LABELS = ['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left']

const PAPER_PRESETS: { label: string; widthMm: number; heightMm: number }[] = [
  { label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  { label: 'A4', widthMm: 210, heightMm: 297 },
]

interface CalibrationStepProps {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  corners: PixelPoint[]
  onAddCorner: (point: PixelPoint) => void
  onReset: () => void
  paperWidthMm: number
  paperHeightMm: number
  onPaperSizeChange: (widthMm: number, heightMm: number) => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}

export function CalibrationControls({
  corners,
  onReset,
  paperWidthMm,
  paperHeightMm,
  onPaperSizeChange,
  onConfirm,
  loading,
  error,
}: CalibrationStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/60">
        Click the 4 corners of the reference sheet of paper, in order: top-left, top-right,
        bottom-right, bottom-left.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50">Paper size</span>
        <div className="flex gap-2">
          {PAPER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onPaperSizeChange(preset.widthMm, preset.heightMm)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                paperWidthMm === preset.widthMm && paperHeightMm === preset.heightMm
                  ? 'bg-white/10 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={paperWidthMm}
            onChange={(e) => onPaperSizeChange(Number(e.target.value), paperHeightMm)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
            aria-label="Paper width (mm)"
          />
          <input
            type="number"
            value={paperHeightMm}
            onChange={(e) => onPaperSizeChange(paperWidthMm, Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
            aria-label="Paper height (mm)"
          />
        </div>
      </div>

      <p className="text-xs text-white/40">
        {corners.length < 4
          ? `Next: click the ${CORNER_LABELS[corners.length].toLowerCase()} corner.`
          : 'All 4 corners set.'}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onReset}
          disabled={corners.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <button
          onClick={onConfirm}
          disabled={corners.length !== 4 || loading}
          className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
        >
          {loading ? 'Rectifying…' : 'Rectify'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function CalibrationPreview({ imageDataUrl, imageWidth, imageHeight, corners, onAddCorner }: CalibrationStepProps) {
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (corners.length >= 4) return
    onAddCorner(clickToPixel(e, e.currentTarget, imageWidth, imageHeight))
  }

  return (
    <div
      onClick={handleClick}
      className="relative w-full max-w-full cursor-crosshair"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <img src={imageDataUrl} alt="Uploaded photo" className="absolute inset-0 h-full w-full object-contain" />
      <svg
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {corners.length === 4 && (
          <polygon
            points={corners.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="rgba(74, 222, 128, 0.15)"
            stroke="#4ade80"
            strokeWidth={Math.max(1, imageWidth / 300)}
          />
        )}
        {corners.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={Math.max(3, imageWidth / 150)} fill="#4ade80" />
        ))}
      </svg>
    </div>
  )
}
