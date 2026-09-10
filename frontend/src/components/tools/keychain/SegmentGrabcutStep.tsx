import { RotateCcw } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import type { BboxPx, PixelPoint } from '../../../types'
import { clickToPixel } from '../shared/imageUtils'

type HintMode = 'bbox' | 'fg' | 'bg'

interface SegmentGrabcutStepProps {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  bbox: BboxPx | null
  onBboxChange: (bbox: BboxPx) => void
  mode: HintMode
  onModeChange: (mode: HintMode) => void
  fgHints: PixelPoint[]
  bgHints: PixelPoint[]
  onAddHint: (point: PixelPoint) => void
  onClearHints: () => void
  maskPreviewDataUrl: string | null
  previewLoading: boolean
  onConfirm: () => void
  confirmLoading: boolean
  error: string | null
}

export function SegmentGrabcutControls({
  mode,
  onModeChange,
  bbox,
  onClearHints,
  fgHints,
  bgHints,
  onConfirm,
  confirmLoading,
  error,
}: SegmentGrabcutStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/60">
        Drag a box around the subject. If the auto result misses something or includes too
        much, switch to a scribble mode and click to nudge it.
      </p>

      <div className="flex gap-2">
        {(['bbox', 'fg', 'bg'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {m === 'bbox' ? 'Box' : m === 'fg' ? '+ Subject' : '+ Background'}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/40">
        {bbox ? 'Box set.' : 'Drag a box around the subject to begin.'} {fgHints.length + bgHints.length} scribble
        point{fgHints.length + bgHints.length === 1 ? '' : 's'}.
      </p>

      <div className="flex gap-2">
        <button
          onClick={onClearHints}
          disabled={fgHints.length === 0 && bgHints.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" /> Clear scribbles
        </button>
        <button
          onClick={onConfirm}
          disabled={!bbox || confirmLoading}
          className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
        >
          {confirmLoading ? 'Working…' : 'Continue'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function SegmentGrabcutPreview({
  imageDataUrl,
  imageWidth,
  imageHeight,
  bbox,
  onBboxChange,
  mode,
  fgHints,
  bgHints,
  onAddHint,
  maskPreviewDataUrl,
  previewLoading,
}: SegmentGrabcutStepProps) {
  const [dragStart, setDragStart] = useState<PixelPoint | null>(null)
  const [dragCurrent, setDragCurrent] = useState<PixelPoint | null>(null)

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    const point = clickToPixel(e, e.currentTarget, imageWidth, imageHeight)
    if (mode === 'bbox') {
      setDragStart(point)
      setDragCurrent(point)
    } else {
      onAddHint(point)
    }
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!dragStart) return
    setDragCurrent(clickToPixel(e, e.currentTarget, imageWidth, imageHeight))
  }

  function handleMouseUp() {
    if (dragStart && dragCurrent) {
      const x = Math.min(dragStart[0], dragCurrent[0])
      const y = Math.min(dragStart[1], dragCurrent[1])
      const w = Math.abs(dragCurrent[0] - dragStart[0])
      const h = Math.abs(dragCurrent[1] - dragStart[1])
      if (w > 4 && h > 4) onBboxChange([x, y, w, h])
    }
    setDragStart(null)
    setDragCurrent(null)
  }

  const displayBbox: BboxPx | null =
    dragStart && dragCurrent
      ? [
          Math.min(dragStart[0], dragCurrent[0]),
          Math.min(dragStart[1], dragCurrent[1]),
          Math.abs(dragCurrent[0] - dragStart[0]),
          Math.abs(dragCurrent[1] - dragStart[1]),
        ]
      : bbox

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full max-w-full select-none"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}`, cursor: mode === 'bbox' ? 'crosshair' : 'copy' }}
    >
      <img src={imageDataUrl} alt="Uploaded photo" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
      {maskPreviewDataUrl && (
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
        {displayBbox && (
          <rect
            x={displayBbox[0]}
            y={displayBbox[1]}
            width={displayBbox[2]}
            height={displayBbox[3]}
            fill="none"
            stroke="#4ade80"
            strokeWidth={Math.max(1, imageWidth / 300)}
          />
        )}
        {fgHints.map(([x, y], i) => (
          <circle key={`fg-${i}`} cx={x} cy={y} r={Math.max(3, imageWidth / 200)} fill="#4ade80" />
        ))}
        {bgHints.map(([x, y], i) => (
          <circle key={`bg-${i}`} cx={x} cy={y} r={Math.max(3, imageWidth / 200)} fill="#f87171" />
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
