interface Point {
  x: number
  y: number
}

interface Column {
  y: number // head position, in rows (fractional)
  speed: number // rows per second
  resetChance: number
}

const CHARS = '0123456789ABCDEF$#%&+-*/<>[]{}'
const FONT_SIZE = 15
const TRAIL_FADE = 0.09 // translucent black overlay per frame — leaves the decaying trail
const LENS_RADIUS = 120
const LENS_MESSAGE = 'LEVEL 5 RESTRICTED ACCESS // SYSTEM ID: ANUJ-GATEWAY-01     '

const RED = { r: 255, g: 26, b: 26 }
const GREEN = { r: 0, g: 255, b: 102 }
const CYAN = { r: 0, g: 240, b: 255 }

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export type MatrixColorPhase = 'red' | 'green'

export function createMatrixRainScene() {
  let columns: Column[] = []
  let columnCount = 0
  let cursor: Point = { x: -1000, y: -1000 }
  let colorT = 0 // 0 = red, 1 = green
  let targetPhase: MatrixColorPhase = 'red'
  let lensScroll = 0

  function ensureColumns(width: number) {
    const count = Math.ceil(width / FONT_SIZE)
    if (count === columnCount) return
    columnCount = count
    columns = Array.from({ length: count }, () => ({
      y: Math.random() * -40,
      speed: 6 + Math.random() * 10,
      resetChance: 0.015 + Math.random() * 0.02,
    }))
  }

  function headColor() {
    const g = { r: lerp(RED.r, GREEN.r, colorT), g: lerp(RED.g, GREEN.g, colorT), b: lerp(RED.b, GREEN.b, colorT) }
    const c = colorT > 0 ? CYAN : RED
    // Blend the head glyph slightly toward the accent (cyan on success, bright red by default).
    return {
      trail: `rgb(${g.r | 0}, ${g.g | 0}, ${g.b | 0})`,
      head: `rgb(${lerp(g.r, c.r, 0.6) | 0}, ${lerp(g.g, c.g, 0.6) | 0}, ${lerp(g.b, c.b, 0.6) | 0})`,
    }
  }

  function drawRain(ctx: CanvasRenderingContext2D, dtMs: number, height: number) {
    const rows = height / FONT_SIZE
    const { trail, head } = headColor()

    ctx.font = `${FONT_SIZE}px ui-monospace, Consolas, monospace`
    ctx.textBaseline = 'top'

    columns.forEach((col, i) => {
      const x = i * FONT_SIZE
      const y = col.y * FONT_SIZE

      ctx.fillStyle = head
      ctx.fillText(randomChar(), x, y)
      ctx.fillStyle = trail
      ctx.fillText(randomChar(), x, y - FONT_SIZE)
      ctx.fillText(randomChar(), x, y - FONT_SIZE * 2)

      col.y += (col.speed * dtMs) / 1000
      if (col.y > rows && Math.random() < col.resetChance) {
        col.y = Math.random() * -20
        col.speed = 6 + Math.random() * 10
      }
    })
  }

  function drawLens(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (cursor.x < -LENS_RADIUS || cursor.x > width + LENS_RADIUS) return
    if (cursor.y < -LENS_RADIUS || cursor.y > height + LENS_RADIUS) return

    ctx.save()
    ctx.beginPath()
    ctx.arc(cursor.x, cursor.y, LENS_RADIUS, 0, Math.PI * 2)
    ctx.clip()

    ctx.fillStyle = 'rgba(4, 6, 10, 0.72)'
    ctx.fillRect(cursor.x - LENS_RADIUS, cursor.y - LENS_RADIUS, LENS_RADIUS * 2, LENS_RADIUS * 2)

    ctx.font = '11px ui-monospace, Consolas, monospace'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    const lineHeight = 15
    const measured = ctx.measureText(LENS_MESSAGE).width
    let row = 0
    for (let y = cursor.y - LENS_RADIUS; y < cursor.y + LENS_RADIUS; y += lineHeight, row++) {
      const offset = (lensScroll + row * 24) % measured
      ctx.fillText(LENS_MESSAGE, cursor.x - LENS_RADIUS - offset, y)
      ctx.fillText(LENS_MESSAGE, cursor.x - LENS_RADIUS - offset + measured, y)
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cursor.x, cursor.y, LENS_RADIUS, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }

  function draw(ctx: CanvasRenderingContext2D, dtMs: number, width: number, height: number) {
    ensureColumns(width)

    ctx.fillStyle = `rgba(4, 4, 8, ${dtMs === 0 ? 1 : TRAIL_FADE})`
    ctx.fillRect(0, 0, width, height)

    colorT += ((targetPhase === 'green' ? 1 : 0) - colorT) * Math.min(1, dtMs / 400)
    lensScroll += (60 * dtMs) / 1000

    drawRain(ctx, dtMs, height)
    drawLens(ctx, width, height)
  }

  function handleMouseMove(x: number, y: number) {
    cursor = { x, y }
  }

  function handleMouseLeave() {
    cursor = { x: -1000, y: -1000 }
  }

  function setColorPhase(phase: MatrixColorPhase) {
    targetPhase = phase
  }

  return { draw, handleMouseMove, handleMouseLeave, setColorPhase }
}
