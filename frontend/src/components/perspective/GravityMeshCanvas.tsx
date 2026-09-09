import { useMemo, useRef, type MouseEvent } from 'react'
import { useCanvasLoop } from '../../hooks/useCanvasLoop'
import { useInView } from '../../hooks/useInView'
import { usePageVisible } from '../../hooks/usePageVisible'

interface MeshPoint {
  ox: number
  oy: number
  x: number
  y: number
  vx: number
  vy: number
}

const SPRING = 0.02
const DAMPING = 0.88
const ACCENT = '196, 132, 252' // violet, matches the app's existing accent (#c084fc)

function createGravityMesh(spacing: number, influenceRadius: number, pullStrength: number) {
  let points: MeshPoint[] = []
  let gridCols = 0
  let gridW = -1
  let gridH = -1
  let cursor = { x: -1000, y: -1000 }

  function ensureGrid(width: number, height: number) {
    if (gridW === width && gridH === height) return
    gridW = width
    gridH = height
    gridCols = Math.floor(width / spacing) + 1
    points = []
    for (let y = 0; y <= height; y += spacing) {
      for (let x = 0; x <= width; x += spacing) {
        points.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 })
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, dtMs: number, width: number, height: number) {
    ensureGrid(width, height)
    ctx.clearRect(0, 0, width, height)

    const dt = Math.min(dtMs, 48) / 16.6667 // clamp so a tab-switch stall doesn't fling the mesh

    for (const p of points) {
      const dx = cursor.x - p.x
      const dy = cursor.y - p.y
      const dist = Math.hypot(dx, dy) || 1
      if (dist < influenceRadius) {
        const force = (1 - dist / influenceRadius) ** 2 * pullStrength
        p.vx += (dx / dist) * force * dt
        p.vy += (dy / dist) * force * dt
      }
      p.vx += (p.ox - p.x) * SPRING * dt
      p.vy += (p.oy - p.y) * SPRING * dt
      p.vx *= DAMPING
      p.vy *= DAMPING
      p.x += p.vx
      p.y += p.vy
    }

    const cx = width / 2
    const cy = height / 2
    const maxDist = Math.hypot(cx, cy) || 1

    ctx.lineWidth = 1
    ctx.strokeStyle = `rgb(${ACCENT})`
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const edgeFade = 1 - Math.min(Math.hypot(p.ox - cx, p.oy - cy) / maxDist, 1)
      const col = i % gridCols

      const right = points[i + 1]
      if (right && col !== gridCols - 1) {
        ctx.globalAlpha = edgeFade * 0.35
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(right.x, right.y)
        ctx.stroke()
      }

      const below = points[i + gridCols]
      if (below) {
        ctx.globalAlpha = edgeFade * 0.35
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(below.x, below.y)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }

  function handleMouseMove(x: number, y: number) {
    cursor = { x, y }
  }

  function handleMouseLeave() {
    cursor = { x: -1000, y: -1000 }
  }

  return { draw, handleMouseMove, handleMouseLeave }
}

interface GravityMeshCanvasProps {
  spacing?: number
  influenceRadius?: number
  pullStrength?: number
}

export function GravityMeshCanvas({
  spacing = 40,
  influenceRadius = 160,
  pullStrength = 18,
}: GravityMeshCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scene = useMemo(
    () => createGravityMesh(spacing, influenceRadius, pullStrength),
    [spacing, influenceRadius, pullStrength],
  )

  const inView = useInView(containerRef)
  const pageVisible = usePageVisible()
  useCanvasLoop(canvasRef, scene.draw, inView && pageVisible)

  function toCanvasPoint(e: MouseEvent<HTMLDivElement>) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseMove={(e) => {
        const p = toCanvasPoint(e)
        if (p) scene.handleMouseMove(p.x, p.y)
      }}
      onMouseLeave={scene.handleMouseLeave}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}
