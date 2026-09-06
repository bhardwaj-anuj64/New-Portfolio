import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Download, RotateCw, Sparkles, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { DoubleSide, type BufferGeometry } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { createStlJob, stlResultUrl } from '../../services/api'
import { useJobProgress } from '../../services/signalr'
import { ToolShell } from './ToolShell'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function downloadStl(bytes: ArrayBuffer) {
  const blob = new Blob([bytes], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mesh.stl'
  a.click()
  URL.revokeObjectURL(url)
}

export function Mesh3DTool() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [stlBytes, setStlBytes] = useState<ArrayBuffer | null>(null)
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { progress, connectionState } = useJobProgress(jobId)

  // Dispose the GPU-side geometry whenever it's replaced, and on unmount.
  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  useEffect(() => {
    if (!jobId || progress?.percentage !== 100) return
    let cancelled = false

    void (async () => {
      const res = await fetch(stlResultUrl(jobId))
      if (!res.ok || cancelled) return
      const buffer = await res.arrayBuffer()
      if (cancelled) return

      const loaded = new STLLoader().parse(buffer)
      loaded.center()
      setGeometry(loaded)
      setStlBytes(buffer)
      setIsGenerating(false)
      setJobId(null)
    })()

    return () => {
      cancelled = true
    }
  }, [jobId, progress])

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setImageFile(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) setImageFile(file)
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setStlBytes(null)
    const imageData = imageFile ? await fileToDataUrl(imageFile) : 'demo-placeholder'
    const { jobId: newJobId } = await createStlJob(imageData)
    setJobId(newJobId)
  }

  return (
    <ToolShell
      title="3D Mesh Generator"
      leftPane={
        <div className="flex h-full flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-center text-xs text-white/50 transition-colors hover:border-white/40"
          >
            <Upload className="h-5 w-5" />
            {imageFile ? imageFile.name : 'Drop a depth map or click to upload'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating…' : 'Generate 3D mesh'}
          </button>

          <label className="flex items-center justify-between text-xs text-white/50">
            Wireframe
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between text-xs text-white/50">
            <span className="flex items-center gap-1">
              <RotateCw className="h-3.5 w-3.5" /> Auto-rotate
            </span>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
            />
          </label>

          <button
            onClick={() => stlBytes && downloadStl(stlBytes)}
            disabled={!stlBytes}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export .stl
          </button>
        </div>
      }
      rightPane={
        <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-lg bg-black/40">
          <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 5]} intensity={0.8} />
            {geometry && (
              <mesh geometry={geometry}>
                <meshStandardMaterial color="#c084fc" wireframe={wireframe} side={DoubleSide} />
              </mesh>
            )}
            <OrbitControls autoRotate={autoRotate} autoRotateSpeed={2} />
          </Canvas>

          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-sm text-white">
              <span>{progress?.status ?? `Queuing job… (${connectionState})`}</span>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${progress?.percentage ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {!geometry && !isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
              Generate a mesh to preview it here.
            </div>
          )}
        </div>
      }
    />
  )
}
