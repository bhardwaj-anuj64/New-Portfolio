import { Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { BufferGeometry } from 'three'
import {
  bandFinalize,
  bandPreview,
  meshFromSilhouette,
  segmentFinalizeGrabCut,
  segmentPreviewGrabCut,
} from '../../../services/api'
import type { BboxPx, ContourOut, KeychainStep, PixelPoint } from '../../../types'
import { buildDxfFromContours } from '../shared/dxfExport'
import { base64ToDataUrl, downscaleToBase64, fileToImage } from '../shared/imageUtils'
import { BuildingOverlay, MeshPreviewControls, MeshPreviewViewer } from '../shared/MeshPreviewStep'
import { ToolShell } from '../ToolShell'
import { AssemblyControls } from './AssemblyStep'
import { rasterizeSubjectMask } from './keychainMask'
import { SegmentGrabcutControls, SegmentGrabcutPreview } from './SegmentGrabcutStep'
import { TonalBandingControls, TonalBandingPreview } from './TonalBandingStep'

const STEP_LABELS: Record<KeychainStep, string> = {
  upload: 'Upload',
  segment: 'Subject',
  band: 'Relief',
  assemble: 'Assembly',
  preview: 'Preview & export',
}
const STEP_ORDER: KeychainStep[] = ['upload', 'segment', 'band', 'assemble', 'preview']

const UPLOAD_MAX_DIMENSION = 1200
const TARGET_SIZE_MM = 60 // longest side of the finished holder's subject plaque
const PREVIEW_MESH_DIM = 150
const EXPORT_MESH_DIM = 400
const DEBOUNCE_MS = 200

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
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

export function KeychainGenerator() {
  const [step, setStep] = useState<KeychainStep>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Upload
  const [imageB64, setImageB64] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 })
  const [pxPerMm, setPxPerMm] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Segment (grabcut)
  const [bbox, setBbox] = useState<BboxPx | null>(null)
  const [hintMode, setHintMode] = useState<'bbox' | 'fg' | 'bg'>('bbox')
  const [fgHints, setFgHints] = useState<PixelPoint[]>([])
  const [bgHints, setBgHints] = useState<PixelPoint[]>([])
  const [maskPreviewB64, setMaskPreviewB64] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Tonal banding
  const [numBands, setNumBands] = useState(4)
  const [minDepthMm, setMinDepthMm] = useState(0.8)
  const [maxDepthMm, setMaxDepthMm] = useState(3.2)
  const [bandShadedB64, setBandShadedB64] = useState<string | null>(null)
  const [bandLoading, setBandLoading] = useState(false)

  // Assembly
  const [borderWidthMm, setBorderWidthMm] = useState(2)
  const [borderHeightMm, setBorderHeightMm] = useState(4)
  const [lightBoxOn, setLightBoxOn] = useState(true)
  const [flatThicknessMm, setFlatThicknessMm] = useState(4)
  const [barHeightMm, setBarHeightMm] = useState(20)
  const [hookCount, setHookCount] = useState(3)
  const [holeDiameterMm, setHoleDiameterMm] = useState(3.5)

  // Mesh preview / export
  const [finalContours, setFinalContours] = useState<ContourOut[] | null>(null)
  const [finalMeshInputs, setFinalMeshInputs] = useState<{
    maskB64: string
    depthMapB64: string | null
    depthScale: number | null
  } | null>(null)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [isWatertight, setIsWatertight] = useState<boolean | null>(null)
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [exportingStl, setExportingStl] = useState(false)

  useEffect(() => {
    return () => geometry?.dispose()
  }, [geometry])

  // Live grabcut preview — debounced, same reasoning as Tool Tracer's segmentation preview.
  useEffect(() => {
    if (step !== 'segment' || !imageB64 || !bbox) {
      setMaskPreviewB64(null)
      return
    }
    setPreviewLoading(true)
    const timer = window.setTimeout(() => {
      segmentPreviewGrabCut(imageB64, bbox, fgHints, bgHints)
        .then((res) => setMaskPreviewB64(res.mask_png_b64))
        .catch(() => setMaskPreviewB64(null))
        .finally(() => setPreviewLoading(false))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [step, imageB64, bbox, fgHints, bgHints])

  // Live tonal-banding preview — debounced.
  useEffect(() => {
    if (step !== 'band' || !imageB64) {
      setBandShadedB64(null)
      return
    }
    setBandLoading(true)
    const timer = window.setTimeout(() => {
      bandPreview(imageB64, numBands, minDepthMm, maxDepthMm)
        .then((res) => setBandShadedB64(res.shaded_preview_png_b64))
        .catch(() => setBandShadedB64(null))
        .finally(() => setBandLoading(false))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [step, imageB64, numBands, minDepthMm, maxDepthMm])

  async function loadFile(file: File) {
    setError(null)
    try {
      const img = await fileToImage(file)
      const { base64, width, height } = downscaleToBase64(img, UPLOAD_MAX_DIMENSION)
      setImageB64(base64)
      setImageDims({ width, height })
      setPxPerMm(Math.max(width, height) / TARGET_SIZE_MM)
      setBbox(null)
      setFgHints([])
      setBgHints([])
      setStep('segment')
    } catch {
      setError('Could not read that image — try a different file.')
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void loadFile(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void loadFile(file)
  }

  function addHint(point: PixelPoint) {
    if (hintMode === 'fg') setFgHints((prev) => [...prev, point])
    else if (hintMode === 'bg') setBgHints((prev) => [...prev, point])
  }

  async function handleBuildMesh() {
    if (!imageB64 || !bbox) return
    setLoading(true)
    setError(null)
    try {
      const finalizeRes = await segmentFinalizeGrabCut(imageB64, bbox, fgHints, bgHints, pxPerMm, 0)
      setFinalContours(finalizeRes.contours)

      let depthMapB64: string | null = null
      let depthScale: number | null = null
      if (lightBoxOn) {
        const bandRes = await bandFinalize(imageB64, numBands, minDepthMm, maxDepthMm)
        depthMapB64 = bandRes.depth_map_png_b64
        depthScale = bandRes.depth_scale
      }

      const maskB64 = rasterizeSubjectMask(finalizeRes.contours, pxPerMm, imageDims.width, imageDims.height)
      setFinalMeshInputs({ maskB64, depthMapB64, depthScale })

      const meshRes = await meshFromSilhouette(maskB64, pxPerMm, PREVIEW_MESH_DIM, {
        depthMapB64,
        depthScale,
        flatThicknessMm,
        borderWidthMm,
        borderHeightMm,
        barHeightMm,
        hookCount,
        holeDiameterMm,
      })
      const loaded = new STLLoader().parse(base64ToArrayBuffer(meshRes.stl_b64))
      loaded.center()
      setGeometry(loaded)
      setIsWatertight(meshRes.is_watertight)
      setStep('preview')
    } catch {
      setError('Could not build the mesh preview. Try a different bounding box.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportStl() {
    if (!finalMeshInputs) return
    setExportingStl(true)
    setError(null)
    try {
      const meshRes = await meshFromSilhouette(finalMeshInputs.maskB64, pxPerMm, EXPORT_MESH_DIM, {
        depthMapB64: finalMeshInputs.depthMapB64,
        depthScale: finalMeshInputs.depthScale,
        flatThicknessMm,
        borderWidthMm,
        borderHeightMm,
        barHeightMm,
        hookCount,
        holeDiameterMm,
      })
      downloadBlob(base64ToArrayBuffer(meshRes.stl_b64), 'keychain-holder.stl', 'model/stl')
    } catch {
      setError('Export failed — try previewing again first.')
    } finally {
      setExportingStl(false)
    }
  }

  function handleExportDxf() {
    if (!finalContours) return
    downloadBlob(buildDxfFromContours(finalContours), 'keychain-holder-subject-outline.dxf', 'application/dxf')
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(step)
    if (idx > 0) setStep(STEP_ORDER[idx - 1])
  }

  const stepIndex = STEP_ORDER.indexOf(step)
  const header = (
    <div className="mb-1 flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-white/40">
        Step {stepIndex + 1} of {STEP_ORDER.length} — {STEP_LABELS[step]}
      </span>
      {step !== 'upload' && (
        <button onClick={goBack} className="text-xs text-white/50 hover:text-white">
          Back
        </button>
      )}
    </div>
  )

  let leftPane = <div />
  let rightPane = <div />

  if (step === 'upload') {
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-center text-xs text-white/50 transition-colors hover:border-white/40"
        >
          <Upload className="h-5 w-5" />
          Drop a photo of a pet, face, or object, or click to upload
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
    rightPane = (
      <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-white/40">
        Upload a photo to begin.
      </div>
    )
  } else if (step === 'segment' && imageB64) {
    const props = {
      imageDataUrl: base64ToDataUrl(imageB64),
      imageWidth: imageDims.width,
      imageHeight: imageDims.height,
      bbox,
      onBboxChange: setBbox,
      mode: hintMode,
      onModeChange: setHintMode,
      fgHints,
      bgHints,
      onAddHint: addHint,
      onClearHints: () => {
        setFgHints([])
        setBgHints([])
      },
      maskPreviewDataUrl: maskPreviewB64 ? base64ToDataUrl(maskPreviewB64) : null,
      previewLoading,
      onConfirm: () => setStep('band'),
      confirmLoading: loading,
      error,
    }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <SegmentGrabcutControls {...props} />
      </div>
    )
    rightPane = <SegmentGrabcutPreview {...props} />
  } else if (step === 'band') {
    const props = {
      numBands,
      onNumBandsChange: setNumBands,
      minDepthMm,
      onMinDepthChange: setMinDepthMm,
      maxDepthMm,
      onMaxDepthChange: setMaxDepthMm,
      previewDataUrl: bandShadedB64 ? base64ToDataUrl(bandShadedB64) : null,
      previewLoading: bandLoading,
      onConfirm: () => setStep('assemble'),
      confirmLoading: loading,
      error,
    }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <TonalBandingControls {...props} />
      </div>
    )
    rightPane = <TonalBandingPreview {...props} />
  } else if (step === 'assemble') {
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <AssemblyControls
          borderWidthMm={borderWidthMm}
          onBorderWidthChange={setBorderWidthMm}
          borderHeightMm={borderHeightMm}
          onBorderHeightChange={setBorderHeightMm}
          lightBoxOn={lightBoxOn}
          onLightBoxChange={setLightBoxOn}
          flatThicknessMm={flatThicknessMm}
          onFlatThicknessChange={setFlatThicknessMm}
          barHeightMm={barHeightMm}
          onBarHeightChange={setBarHeightMm}
          hookCount={hookCount}
          onHookCountChange={setHookCount}
          holeDiameterMm={holeDiameterMm}
          onHoleDiameterChange={setHoleDiameterMm}
          onConfirm={() => void handleBuildMesh()}
          loading={loading}
          error={error}
        />
      </div>
    )
    rightPane = (
      <div className="relative h-full min-h-[280px] overflow-hidden rounded-lg bg-black/40">
        {bandShadedB64 ? (
          <img src={base64ToDataUrl(bandShadedB64)} alt="Relief preview" className="h-full w-full object-contain opacity-70" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/40">Adjust settings, then preview the mesh.</p>
          </div>
        )}
        <BuildingOverlay active={loading} />
      </div>
    )
  } else if (step === 'preview') {
    const props = {
      geometry,
      isWatertight,
      wireframe,
      onWireframeChange: setWireframe,
      autoRotate,
      onAutoRotateChange: setAutoRotate,
      onExportStl: () => void handleExportStl(),
      onExportDxf: handleExportDxf,
      exportingStl,
      loading,
      error,
    }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <MeshPreviewControls {...props} />
      </div>
    )
    rightPane = <MeshPreviewViewer {...props} />
  }

  return <ToolShell title="Keychain Holder" leftPane={leftPane} rightPane={rightPane} />
}
