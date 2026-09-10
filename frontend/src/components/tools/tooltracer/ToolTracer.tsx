import { Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { BufferGeometry } from 'three'
import {
  calibrateRectify,
  meshFromPockets,
  segmentFinalize,
  segmentIslands,
  segmentPreviewMagicWand,
} from '../../../services/api'
import type { ContourOut, IslandOut, PixelPoint, PocketTool, ToolTracerStep } from '../../../types'
import { ToolShell } from '../ToolShell'
import { CalibrationControls, CalibrationPreview } from './CalibrationStep'
import { buildToolTracerDxf } from './dxfExport'
import { base64ToDataUrl, downscaleToBase64, fileToImage, loadImageFromDataUrl } from './imageUtils'
import { IslandReviewControls, IslandReviewPreview } from './IslandReviewStep'
import { groupContoursByTool, rasterizeToolMask } from './maskRasterize'
import { MeshPreviewControls, MeshPreviewViewer } from './MeshPreviewStep'
import { OrganizerControls, OrganizerPreview } from './OrganizerStep'
import { SegmentationControls, SegmentationPreview } from './SegmentationStep'

const STEP_LABELS: Record<ToolTracerStep, string> = {
  upload: 'Upload',
  calibrate: 'Calibrate',
  segment: 'Segment',
  review: 'Review tools',
  organize: 'Organizer setup',
  preview: 'Preview & export',
}
const STEP_ORDER: ToolTracerStep[] = ['upload', 'calibrate', 'segment', 'review', 'organize', 'preview']

const UPLOAD_MAX_DIMENSION = 1600
const TARGET_PX_PER_MM = 6
const PREVIEW_MESH_DIM = 150
const EXPORT_MESH_DIM = 400
const SEGMENT_DEBOUNCE_MS = 200

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

export function ToolTracer() {
  const [step, setStep] = useState<ToolTracerStep>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Upload
  const [imageB64, setImageB64] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calibration
  const [corners, setCorners] = useState<PixelPoint[]>([])
  const [paperWidthMm, setPaperWidthMm] = useState(215.9)
  const [paperHeightMm, setPaperHeightMm] = useState(279.4)
  const [rectifiedImageB64, setRectifiedImageB64] = useState<string | null>(null)
  const [rectifiedDims, setRectifiedDims] = useState({ width: 0, height: 0 })
  const [pxPerMm, setPxPerMm] = useState<number | null>(null)

  // Segmentation
  const [seeds, setSeeds] = useState<PixelPoint[]>([])
  const [tolerance, setTolerance] = useState(15)
  const [maskPreviewB64, setMaskPreviewB64] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Island review
  const [islands, setIslands] = useState<IslandOut[]>([])
  const [includedIds, setIncludedIds] = useState<Set<number>>(new Set())

  // Organizer
  const [pockets, setPockets] = useState<PocketTool[]>([])
  const [blockThicknessMm, setBlockThicknessMm] = useState(6)
  const [padMm, setPadMm] = useState(0.5)

  // Mesh preview / export
  const [finalContours, setFinalContours] = useState<ContourOut[] | null>(null)
  const [finalTools, setFinalTools] = useState<{ mask_png_b64: string; pocket_depth_mm: number }[]>([])
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [isWatertight, setIsWatertight] = useState<boolean | null>(null)
  const [wireframe, setWireframe] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [exportingStl, setExportingStl] = useState(false)

  useEffect(() => {
    return () => geometry?.dispose()
  }, [geometry])

  // Live segmentation preview — debounced so dragging the tolerance slider or clicking several
  // seeds quickly doesn't hammer the backend with a call per intermediate value.
  useEffect(() => {
    if (step !== 'segment' || !rectifiedImageB64 || seeds.length === 0) {
      setMaskPreviewB64(null)
      return
    }
    setPreviewLoading(true)
    const timer = window.setTimeout(() => {
      segmentPreviewMagicWand(rectifiedImageB64, seeds, tolerance)
        .then((res) => setMaskPreviewB64(res.mask_png_b64))
        .catch(() => setMaskPreviewB64(null))
        .finally(() => setPreviewLoading(false))
    }, SEGMENT_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [step, rectifiedImageB64, seeds, tolerance])

  async function loadFile(file: File) {
    setError(null)
    const img = await fileToImage(file)
    const { base64, width, height } = downscaleToBase64(img, UPLOAD_MAX_DIMENSION)
    setImageB64(base64)
    setImageDims({ width, height })
    setCorners([])
    setStep('calibrate')
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

  async function handleRectify() {
    if (!imageB64 || corners.length !== 4) return
    setLoading(true)
    setError(null)
    try {
      const res = await calibrateRectify(imageB64, corners, paperWidthMm, paperHeightMm, TARGET_PX_PER_MM)
      const rectifiedImg = await loadImageFromDataUrl(base64ToDataUrl(res.rectified_image_b64))
      setRectifiedImageB64(res.rectified_image_b64)
      setRectifiedDims({ width: rectifiedImg.naturalWidth, height: rectifiedImg.naturalHeight })
      setPxPerMm(res.px_per_mm)
      setSeeds([])
      setStep('segment')
    } catch {
      setError('Could not rectify the photo — check the corner order and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFindTools() {
    if (!rectifiedImageB64 || pxPerMm === null) return
    setLoading(true)
    setError(null)
    try {
      const res = await segmentIslands(rectifiedImageB64, seeds, tolerance, pxPerMm)
      setIslands(res.islands)
      setIncludedIds(new Set(res.islands.map((i) => i.id)))
      setStep('review')
    } catch {
      setError('Could not find tools in the image. Try adjusting seeds or tolerance.')
    } finally {
      setLoading(false)
    }
  }

  function toggleIsland(id: number) {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleReviewConfirm() {
    const defaultDepth = Math.min(3, blockThicknessMm - 0.5)
    setPockets(
      islands
        .filter((i) => includedIds.has(i.id))
        .map((i) => ({
          islandId: i.id,
          areaMm2: i.area_mm2,
          thumbnailPngB64: i.thumbnail_png_b64,
          pocketDepthMm: defaultDepth,
        })),
    )
    setStep('organize')
  }

  function updatePocketDepth(islandId: number, depthMm: number) {
    setPockets((prev) => prev.map((p) => (p.islandId === islandId ? { ...p, pocketDepthMm: depthMm } : p)))
  }

  async function handleBuildPreview() {
    if (!rectifiedImageB64 || pxPerMm === null || pockets.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const finalizeRes = await segmentFinalize(
        rectifiedImageB64,
        seeds,
        tolerance,
        pxPerMm,
        padMm,
        pockets.map((p) => p.islandId),
      )
      setFinalContours(finalizeRes.contours)

      const groups = groupContoursByTool(finalizeRes.contours, pockets.map((p) => p.islandId))
      const tools = groups.map((group) => {
        const pocket = pockets.find((p) => p.islandId === group.islandId)
        return {
          mask_png_b64: rasterizeToolMask(group, pxPerMm, rectifiedDims.width, rectifiedDims.height),
          pocket_depth_mm: pocket?.pocketDepthMm ?? blockThicknessMm / 2,
        }
      })
      setFinalTools(tools)

      const meshRes = await meshFromPockets(tools, blockThicknessMm, pxPerMm, PREVIEW_MESH_DIM)
      const loaded = new STLLoader().parse(base64ToArrayBuffer(meshRes.stl_b64))
      loaded.center()
      setGeometry(loaded)
      setIsWatertight(meshRes.is_watertight)
      setStep('preview')
    } catch {
      setError('Could not build the mesh preview. Check pocket depths against the block thickness.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportStl() {
    if (finalTools.length === 0 || pxPerMm === null) return
    setExportingStl(true)
    setError(null)
    try {
      const meshRes = await meshFromPockets(finalTools, blockThicknessMm, pxPerMm, EXPORT_MESH_DIM)
      downloadBlob(base64ToArrayBuffer(meshRes.stl_b64), 'tool-organizer.stl', 'model/stl')
    } catch {
      setError('Export failed — try previewing again first.')
    } finally {
      setExportingStl(false)
    }
  }

  function handleExportDxf() {
    if (!finalContours) return
    downloadBlob(buildToolTracerDxf(finalContours), 'tool-outlines.dxf', 'application/dxf')
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
          Drop a photo of tools on paper, or click to upload
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
  } else if (step === 'calibrate' && imageB64) {
    const props = {
      imageDataUrl: base64ToDataUrl(imageB64),
      imageWidth: imageDims.width,
      imageHeight: imageDims.height,
      corners,
      onAddCorner: (pt: PixelPoint) => setCorners((prev) => [...prev, pt]),
      onReset: () => setCorners([]),
      paperWidthMm,
      paperHeightMm,
      onPaperSizeChange: (w: number, h: number) => {
        setPaperWidthMm(w)
        setPaperHeightMm(h)
      },
      onConfirm: () => void handleRectify(),
      loading,
      error,
    }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <CalibrationControls {...props} />
      </div>
    )
    rightPane = <CalibrationPreview {...props} />
  } else if (step === 'segment' && rectifiedImageB64) {
    const props = {
      imageDataUrl: base64ToDataUrl(rectifiedImageB64),
      imageWidth: rectifiedDims.width,
      imageHeight: rectifiedDims.height,
      seeds,
      onAddSeed: (pt: PixelPoint) => setSeeds((prev) => [...prev, pt]),
      onResetSeeds: () => setSeeds([]),
      tolerance,
      onToleranceChange: setTolerance,
      maskPreviewDataUrl: maskPreviewB64 ? base64ToDataUrl(maskPreviewB64) : null,
      previewLoading,
      onConfirm: () => void handleFindTools(),
      confirmLoading: loading,
      error,
    }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <SegmentationControls {...props} />
      </div>
    )
    rightPane = <SegmentationPreview {...props} />
  } else if (step === 'review') {
    const props = { islands, includedIds, onToggle: toggleIsland, onConfirm: handleReviewConfirm, loading, error }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <IslandReviewControls {...props} />
      </div>
    )
    rightPane = <IslandReviewPreview {...props} />
  } else if (step === 'organize') {
    const props = {
      pockets,
      onDepthChange: updatePocketDepth,
      blockThicknessMm,
      onBlockThicknessChange: setBlockThicknessMm,
      padMm,
      onPadMmChange: setPadMm,
      onConfirm: () => void handleBuildPreview(),
      loading,
      error,
    }
    leftPane = (
      <div className="flex h-full flex-col gap-4">
        {header}
        <OrganizerControls {...props} />
      </div>
    )
    rightPane = <OrganizerPreview {...props} />
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

  return <ToolShell title="Tool Tracer" leftPane={leftPane} rightPane={rightPane} />
}
