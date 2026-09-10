interface AssemblyStepProps {
  borderWidthMm: number
  onBorderWidthChange: (mm: number) => void
  lightBoxOn: boolean
  onLightBoxChange: (on: boolean) => void
  flatThicknessMm: number
  onFlatThicknessChange: (mm: number) => void
  keyringOn: boolean
  onKeyringChange: (on: boolean) => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}

export function AssemblyControls({
  borderWidthMm,
  onBorderWidthChange,
  lightBoxOn,
  onLightBoxChange,
  flatThicknessMm,
  onFlatThicknessChange,
  keyringOn,
  onKeyringChange,
  onConfirm,
  loading,
  error,
}: AssemblyStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-white/50">
        Border width ({borderWidthMm}mm)
        <input
          type="range"
          min={0.5}
          max={6}
          step={0.5}
          value={borderWidthMm}
          onChange={(e) => onBorderWidthChange(Number(e.target.value))}
        />
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

      <label className="flex items-center justify-between text-xs text-white/50">
        Keyring hole
        <input type="checkbox" checked={keyringOn} onChange={(e) => onKeyringChange(e.target.checked)} />
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
