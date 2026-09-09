import { useEffect, useRef, type RefObject } from 'react'

type DrawFn = (ctx: CanvasRenderingContext2D, dtMs: number, width: number, height: number) => void

export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  draw: DrawFn,
  active: boolean,
) {
  // Ref, not a dependency: lets the caller pass a fresh closure every render
  // without tearing down and restarting the RAF loop each time.
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap — 3x/4x DPR is pure fill-rate cost, invisible past 2x
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      drawRef.current(ctx, 0, canvas.clientWidth, canvas.clientHeight) // one static frame, no loop
      return () => resizeObserver.disconnect()
    }

    let frameId: number
    let last = performance.now()
    const tick = (now: number) => {
      const dtMs = now - last
      last = now
      drawRef.current(ctx, dtMs, canvas.clientWidth, canvas.clientHeight)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [canvasRef, active]) // toggling `active` false -> true tears down and restarts cleanly
}
