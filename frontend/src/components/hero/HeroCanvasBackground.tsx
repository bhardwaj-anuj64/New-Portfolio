import { useMemo, useRef, type MouseEvent } from 'react'
import { useCanvasLoop } from '../../hooks/useCanvasLoop'
import { useInView } from '../../hooks/useInView'
import { usePageVisible } from '../../hooks/usePageVisible'
import { createHeroLightningScene } from './heroLightningScene'

export function HeroCanvasBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scene = useMemo(() => createHeroLightningScene(), [])

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
      onClick={(e) => {
        const p = toCanvasPoint(e)
        if (p) scene.handleClick(p.x, p.y)
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}
