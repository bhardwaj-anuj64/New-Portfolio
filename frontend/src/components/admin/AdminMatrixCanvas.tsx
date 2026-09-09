import { useEffect, useMemo, useRef, type MouseEvent } from 'react'
import { useCanvasLoop } from '../../hooks/useCanvasLoop'
import { useInView } from '../../hooks/useInView'
import { usePageVisible } from '../../hooks/usePageVisible'
import { createMatrixRainScene, type MatrixColorPhase } from './matrixRainScene'

interface AdminMatrixCanvasProps {
  colorPhase: MatrixColorPhase
}

export function AdminMatrixCanvas({ colorPhase }: AdminMatrixCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scene = useMemo(() => createMatrixRainScene(), [])

  const inView = useInView(containerRef)
  const pageVisible = usePageVisible()
  useCanvasLoop(canvasRef, scene.draw, inView && pageVisible)

  useEffect(() => {
    scene.setColorPhase(colorPhase)
  }, [scene, colorPhase])

  function toCanvasPoint(e: MouseEvent<HTMLDivElement>) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      onMouseMove={(e) => {
        const p = toCanvasPoint(e)
        if (p) scene.handleMouseMove(p.x, p.y)
      }}
      onMouseLeave={() => scene.handleMouseLeave()}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}
