import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ToolShell } from './ToolShell'

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

const MAX_DIMENSION = 480

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return gray
}

// ponytail: separable box blur with clamped edges — good enough for a live noise-reduction
// slider, not a photographic-quality Gaussian blur.
function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) return src
  const size = radius * 2 + 1
  const tmp = new Float32Array(width * height)
  const out = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = -radius; x <= radius; x++) {
      sum += src[y * width + Math.min(width - 1, Math.max(0, x))]
    }
    for (let x = 0; x < width; x++) {
      tmp[y * width + x] = sum / size
      sum +=
        src[y * width + Math.min(width - 1, x + radius + 1)] -
        src[y * width + Math.max(0, x - radius)]
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = -radius; y <= radius; y++) {
      sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x]
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / size
      sum +=
        tmp[Math.min(height - 1, y + radius + 1) * width + x] -
        tmp[Math.max(0, y - radius) * width + x]
    }
  }

  return out
}

function sobelMagnitude(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height)
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0
      let sy = 0
      let k = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = gray[(y + dy) * width + (x + dx)]
          sx += v * gx[k]
          sy += v * gy[k]
          k++
        }
      }
      out[y * width + x] = Math.sqrt(sx * sx + sy * sy)
    }
  }
  return out
}

// Traces horizontal + vertical runs of edge pixels into line segments. A pragmatic stand-in
// for full marching-squares contour tracing (potrace-style), without a heavy WASM dependency.
function extractSegments(magnitude: Float32Array, width: number, height: number, threshold: number): Segment[] {
  const on = (x: number, y: number) => magnitude[y * width + x] >= threshold
  const segments: Segment[] = []

  for (let y = 0; y < height; y++) {
    let start = -1
    for (let x = 0; x < width; x++) {
      if (on(x, y) && start === -1) start = x
      if ((!on(x, y) || x === width - 1) && start !== -1) {
        const end = on(x, y) ? x : x - 1
        if (end > start) segments.push({ x1: start, y1: y, x2: end, y2: y })
        start = -1
      }
    }
  }

  for (let x = 0; x < width; x++) {
    let start = -1
    for (let y = 0; y < height; y++) {
      if (on(x, y) && start === -1) start = y
      if ((!on(x, y) || y === height - 1) && start !== -1) {
        const end = on(x, y) ? y : y - 1
        if (end > start) segments.push({ x1: x, y1: start, x2: x, y2: end })
        start = -1
      }
    }
  }

  return segments
}

// Minimal ENTITIES-only DXF (R12 group codes) — most CAD/CNC tools accept this without the
// optional HEADER/TABLES/BLOCKS sections.
function buildDxf(segments: Segment[], height: number): string {
  const out: string[] = []
  const push = (code: number, value: string | number) => out.push(String(code), String(value))

  push(0, 'SECTION')
  push(2, 'ENTITIES')
  for (const s of segments) {
    push(0, 'LINE')
    push(8, '0')
    push(10, s.x1.toFixed(3))
    push(20, (height - s.y1).toFixed(3))
    push(30, '0')
    push(11, s.x2.toFixed(3))
    push(21, (height - s.y2).toFixed(3))
    push(31, '0')
  }
  push(0, 'ENDSEC')
  push(0, 'EOF')

  return out.join('\n')
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function DxfTool() {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)
  const [threshold, setThreshold] = useState(60)
  const [smoothing, setSmoothing] = useState(1)
  const [showOriginal, setShowOriginal] = useState(true)
  const [segments, setSegments] = useState<Segment[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isProcessing, setIsProcessing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!imageEl || !canvasRef.current) return

    setIsProcessing(true)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(imageEl.naturalWidth, imageEl.naturalHeight))
    const width = Math.max(1, Math.round(imageEl.naturalWidth * scale))
    const height = Math.max(1, Math.round(imageEl.naturalHeight * scale))

    const canvas = canvasRef.current
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(imageEl, 0, 0, width, height)

    const imageData = ctx.getImageData(0, 0, width, height)
    const gray = toGrayscale(imageData.data, width, height)
    const blurred = boxBlur(gray, width, height, smoothing)
    const magnitude = sobelMagnitude(blurred, width, height)

    setDimensions({ width, height })
    setSegments(extractSegments(magnitude, width, height, threshold))
    setIsProcessing(false)
  }, [imageEl, threshold, smoothing])

  function loadFile(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url

    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = url
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  function handleExport() {
    if (segments.length === 0) return
    downloadBlob(buildDxf(segments, dimensions.height), 'trace.dxf', 'application/dxf')
  }

  return (
    <ToolShell
      title="DXF Contour Tracer"
      leftPane={
        <div className="flex h-full flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-center text-xs text-white/50 transition-colors hover:border-white/40"
          >
            <Upload className="h-5 w-5" />
            Drop an image or click to upload
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>

          <label className="flex flex-col gap-1 text-xs text-white/50">
            Edge threshold ({threshold})
            <input
              type="range"
              min={10}
              max={200}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-white/50">
            Smoothing ({smoothing}px)
            <input
              type="range"
              min={0}
              max={4}
              value={smoothing}
              onChange={(e) => setSmoothing(Number(e.target.value))}
            />
          </label>

          <label className="flex items-center justify-between text-xs text-white/50">
            Show original image
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
            />
          </label>

          <button
            onClick={handleExport}
            disabled={segments.length === 0}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export .dxf
          </button>
        </div>
      }
      rightPane={
        <div className="flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-lg bg-black/40">
          {!imageEl && <p className="text-sm text-white/40">Upload an image to trace its edges.</p>}
          {imageEl && (
            <div
              className="relative w-full max-w-full"
              style={{ aspectRatio: `${dimensions.width || 1} / ${dimensions.height || 1}` }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                style={{ opacity: showOriginal ? 0.35 : 0 }}
              />
              <svg
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                {segments.map((s, i) => (
                  <line
                    key={i}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={showOriginal ? '#4ade80' : '#ffffff'}
                    strokeWidth={1}
                  />
                ))}
              </svg>
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white/60">
                  Processing…
                </div>
              )}
            </div>
          )}
        </div>
      }
    />
  )
}
