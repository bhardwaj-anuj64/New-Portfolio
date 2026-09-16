interface AssemblyStepProps {
  borderWidthMm: number
  onBorderWidthChange: (mm: number) => void
  borderHeightMm: number
  onBorderHeightChange: (mm: number) => void
  lightBoxOn: boolean
  onLightBoxChange: (on: boolean) => void
  flatThicknessMm: number
  onFlatThicknessChange: (mm: number) => void
  barHeightMm: number
  onBarHeightChange: (mm: number) => void
  hookCount: number
  onHookCountChange: (count: number) => void
  holeDiameterMm: number
  onHoleDiameterChange: (mm: number) => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}

export function AssemblyControls({
  borderWidthMm,
  onBorderWidthChange,
  borderHeightMm,
  onBorderHeightChange,
  lightBoxOn,
  onLightBoxChange,
  flatThicknessMm,
  onFlatThicknessChange,
  barHeightMm,
  onBarHeightChange,
  hookCount,
  onHookCountChange,
  holeDiameterMm,
  onHoleDiameterChange,
  onConfirm,
  loading,
  error,
}: AssemblyStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/60">
        A wall-mounted plaque: your subject sits inside a thin raised frame, with a hanger bar
        below it. The bar's holes are pilot holes for separate, swappable screw-in hooks — not
        something printed on the piece itself, so size them to whatever hook hardware you use.
      </p>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Frame rim width ({borderWidthMm}mm)
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          value={borderWidthMm}
          onChange={(e) => onBorderWidthChange(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Frame + bar height ({borderHeightMm}mm)
        <input
          type="range"
          min={2}
          max={8}
          step={0.5}
          value={borderHeightMm}
          onChange={(e) => onBorderHeightChange(Number(e.target.value))}
        />
        <span className="text-white/30">Keep above the relief depth below so the rim reads as raised.</span>
      </label>

      <label className="flex items-center justify-between text-xs text-white/50">
        Light-box relief backing
        <input type="checkbox" checked={lightBoxOn} onChange={(e) => onLightBoxChange(e.target.checked)} />
      </label>

      {!lightBoxOn && (
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Flat thickness ({flatThicknessMm}mm)
          <input
            type="range"
            min={2}
            max={8}
            step={0.5}
            value={flatThicknessMm}
            onChange={(e) => onFlatThicknessChange(Number(e.target.value))}
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Hanger bar height ({barHeightMm}mm)
        <input
          type="range"
          min={10}
          max={40}
          step={1}
          value={barHeightMm}
          onChange={(e) => onBarHeightChange(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Mounting holes ({hookCount})
        <input
          type="range"
          min={0}
          max={6}
          step={1}
          value={hookCount}
          onChange={(e) => onHookCountChange(Number(e.target.value))}
        />
      </label>

      {hookCount > 0 && (
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Hole diameter ({holeDiameterMm}mm)
          <input
            type="range"
            min={2}
            max={8}
            step={0.5}
            value={holeDiameterMm}
            onChange={(e) => onHoleDiameterChange(Number(e.target.value))}
          />
          <span className="text-white/30">Pilot size for the screw-in hook you'll use — not a keyring hole.</span>
        </label>
      )}

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
