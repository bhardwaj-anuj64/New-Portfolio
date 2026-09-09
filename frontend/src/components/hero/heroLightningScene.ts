interface Point {
  x: number
  y: number
}

interface Bolt {
  points: Point[]
  life: number
  maxLife: number
}

interface Pulse {
  x: number
  y: number
  radius: number
  life: number
  maxLife: number
}

const GRID_SPACING = 48
const MAX_BOLTS = 5
const MAX_PULSES = 4
const ACCENT = '196, 132, 252' // violet, matches the app's existing accent (#c084fc)

function nearestGridPoint(x: number, y: number): Point {
  return { x: Math.round(x / GRID_SPACING) * GRID_SPACING, y: Math.round(y / GRID_SPACING) * GRID_SPACING }
}

// Classic midpoint-displacement lightning generator: recursively kinks the line,
// shrinking the displacement each level so the bolt looks jagged near its ends too.
function buildBoltPath(from: Point, to: Point, displace: number): Point[] {
  if (displace < 6) return [from, to]

  const mid: Point = {
    x: (from.x + to.x) / 2 + (Math.random() - 0.5) * displace,
    y: (from.y + to.y) / 2 + (Math.random() - 0.5) * displace,
  }
  const left = buildBoltPath(from, mid, displace / 2)
  const right = buildBoltPath(mid, to, displace / 2)
  return [...left, ...right.slice(1)]
}

export function createHeroLightningScene() {
  let cursor: Point = { x: -1000, y: -1000 } // off-screen until the first move
  let bolts: Bolt[] = []
  let pulses: Pulse[] = []
  let msUntilNextBolt = 400

  function spawnBolt(width: number, height: number) {
    const target = nearestGridPoint(
      Math.min(Math.max(cursor.x, 0), width),
      Math.min(Math.max(cursor.y, 0), height),
    )

    const side = Math.floor(Math.random() * 4)
    const origin: Point =
      side === 0
        ? { x: Math.random() * width, y: 0 }
        : side === 1
          ? { x: width, y: Math.random() * height }
          : side === 2
            ? { x: Math.random() * width, y: height }
            : { x: 0, y: Math.random() * height }

    const dist = Math.hypot(target.x - origin.x, target.y - origin.y)
    bolts.push({ points: buildBoltPath(origin, target, dist / 3), life: 260, maxLife: 260 })
    if (bolts.length > MAX_BOLTS) bolts.shift()
  }

  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = `rgba(${ACCENT}, 0.05)`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= width; x += GRID_SPACING) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    for (let y = 0; y <= height; y += GRID_SPACING) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()
  }

  function drawBolts(ctx: CanvasRenderingContext2D) {
    for (const bolt of bolts) {
      const flicker = 0.6 + Math.random() * 0.4
      const alpha = (bolt.life / bolt.maxLife) * flicker
      ctx.strokeStyle = `rgba(${ACCENT}, ${alpha})`
      ctx.lineWidth = 1.5
      ctx.shadowColor = `rgba(${ACCENT}, 0.8)`
      ctx.shadowBlur = 8
      ctx.beginPath()
      bolt.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
    }
    ctx.shadowBlur = 0
  }

  function drawPulses(ctx: CanvasRenderingContext2D) {
    for (const pulse of pulses) {
      const alpha = pulse.life / pulse.maxLife
      ctx.strokeStyle = `rgba(${ACCENT}, ${alpha * 0.8})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  function draw(ctx: CanvasRenderingContext2D, dtMs: number, width: number, height: number) {
    ctx.clearRect(0, 0, width, height)
    drawGrid(ctx, width, height)

    msUntilNextBolt -= dtMs
    if (msUntilNextBolt <= 0) {
      spawnBolt(width, height)
      msUntilNextBolt = 500 + Math.random() * 700
    }
    bolts = bolts.filter((b) => (b.life -= dtMs) > 0)
    drawBolts(ctx)

    pulses = pulses.filter((p) => {
      p.radius += (220 * dtMs) / 1000
      p.life -= dtMs
      return p.life > 0
    })
    drawPulses(ctx)
  }

  function handleMouseMove(x: number, y: number) {
    cursor = { x, y }
  }

  function handleClick(x: number, y: number) {
    pulses.push({ x, y, radius: 4, life: 700, maxLife: 700 })
    if (pulses.length > MAX_PULSES) pulses.shift()
  }

  return { draw, handleMouseMove, handleClick }
}
