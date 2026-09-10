interface TonalBandingStepProps {
  numBands: number
  onNumBandsChange: (n: number) => void
  minDepthMm: number
  onMinDepthChange: (mm: number) => void
  maxDepthMm: number
  onMaxDepthChange: (mm: number) => void
  previewDataUrl: string | null
  previewLoading: boolean
  onConfirm: () => void
  confirmLoading: boolean
  error: string | null
}

export function TonalBandingControls({
  numBands,
  onNumBandsChange,
  minDepthMm,
  onMinDepthChange,
  maxDepthMm,
  onMaxDepthChange,
  onConfirm,
  confirmLoading,
  error,
}: TonalBandingStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/60">
        This relief becomes the light-box backing. Darker areas print thicker, so they show up
        as highlights when backlit.
      </p>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Band count ({numBands})
        <input
          type="range"
          min={2}
          max={7}
          value={numBands}
          onChange={(e) => onNumBandsChange(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Min depth ({minDepthMm}mm)
        <input
          type="range"
          min={0.4}
          max={maxDepthMm - 0.2}
          step={0.1}
          value={minDepthMm}
          onChange={(e) => onMinDepthChange(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Max depth ({maxDepthMm}mm)
        <input
          type="range"
          min={minDepthMm + 0.2}
          max={6}
          step={0.1}
          value={maxDepthMm}
          onChange={(e) => onMaxDepthChange(Number(e.target.value))}
        />
      </label>

      <button
        onClick={onConfirm}
        disabled={confirmLoading}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
      >
        {confirmLoading ? 'Working…' : 'Continue'}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function TonalBandingPreview({ previewDataUrl, previewLoading }: TonalBandingStepProps) {
  return (
    <div className="relative flex h-full min-h-[280px] w-full items-center justify-center overflow-hidden rounded-lg bg-black/40">
      {previewDataUrl ? (
        <img src={previewDataUrl} alt="Tonal-band relief preview" className="h-full w-full object-contain" />
      ) : (
        <p className="text-sm text-white/40">Adjust the sliders to preview the relief.</p>
      )}
      {previewLoading && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/70">
          Updating…
        </div>
      )}
    </div>
  )
}
