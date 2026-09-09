interface Point {
  x: number
  y: number
}

interface Trace {
  a: number
  b: number
  path: Point[]
  length: number
  bundle: number // extra parallel sibling lines drawn alongside, for a ribbon-cable look
}

interface BusLine {
  path: [Point, Point]
}

interface SignalPulse {
  traceIndex: number
  reverse: boolean // false: travels a->b (dist counts up from a). true: travels b->a.
  dist: number
  speed: number
}

interface ShockRing {
  x: number
  y: number
  radius: number
  life: number
  maxLife: number
}

const CELL = 80
const NEIGHBORS_MIN = 2
const NEIGHBORS_MAX = 3
const BUNDLE_CHANCE = 0.2
const PAD_CLUSTER_CHANCE = 0.12
const BUS_GROUPS_MIN = 2
const BUS_GROUPS_MAX = 3
const CHAMFER_PX = 12
const PULSE_COUNT = 26
const PULSE_PIXELS_PER_SEC = 70
const ATTRACT_RADIUS = 140
const ATTRACT_BOOST = 3
const CLICK_RADIUS = 45
const PROXIMITY_RADIUS = 60
const MAX_SHOCK_RINGS = 6
const TRAIL_PX = 14
const ACCENT = '110, 231, 183' // emerald-ish glow, distinct from the violet used elsewhere

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function pathLength(path: Point[]): number {
  let len = 0
  for (let i = 1; i < path.length; i++) len += dist(path[i - 1], path[i])
  return len
}

function pointAtArcLength(path: Point[], s: number): Point {
  let remaining = Math.max(s, 0)
  for (let i = 1; i < path.length; i++) {
    const segLen = dist(path[i - 1], path[i])
    if (remaining <= segLen || i === path.length - 1) {
      const t = segLen === 0 ? 0 : Math.min(remaining / segLen, 1)
      return lerpPoint(path[i - 1], path[i], t)
    }
    remaining -= segLen
  }
  return path[path.length - 1]
}

// Layered sine waves stand in for noise — cheap, dependency-free, and enough to make
// some board regions read as denser/sparser than others instead of a uniform fill.
function densityAt(x: number, y: number): number {
  const n = Math.sin(x * 0.01) * Math.cos(y * 0.008) + Math.sin((x + y) * 0.005)
  return 0.32 + ((n + 2) / 4) * 0.5
}

// Scatter nodes on a jittered grid, thinned by the density field above.
function placeNodes(width: number, height: number): Point[] {
  const cols = Math.ceil(width / CELL)
  const rows = Math.ceil(height / CELL)
  const nodes: Point[] = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const cx = c * CELL
      const cy = r * CELL
      if (Math.random() > densityAt(cx, cy)) continue
      nodes.push({ x: cx + (Math.random() - 0.5) * CELL * 0.7, y: cy + (Math.random() - 0.5) * CELL * 0.7 })
    }
  }
  return nodes
}

// Cuts a 45-degree bevel into every interior corner of a polyline — the chamfered-corner
// style real PCB autorouters default to instead of hard 90-degree bends.
function chamferPath(path: Point[], amount: number): Point[] {
  if (path.length < 3) return path
  const out: Point[] = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const curr = path[i]
    const next = path[i + 1]
    const inLen = dist(prev, curr)
    const outLen = dist(curr, next)
    const c = Math.min(amount, inLen * 0.4, outLen * 0.4)
    if (c < 1.5) {
      out.push(curr)
      continue
    }
    out.push(lerpPoint(curr, prev, c / inLen))
    out.push(lerpPoint(curr, next, c / outLen))
  }
  out.push(path[path.length - 1])
  return out
}

// Straightforward one-bend route — nearly a straight line whenever A and B are
// already roughly aligned on one axis.
function orthogonalRoute(a: Point, b: Point): Point[] {
  return Math.random() < 0.5 ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b]
}

// Two-bend dogleg (Z route) — trace ducks sideways partway across.
function zRoute(a: Point, b: Point): Point[] {
  const midX = a.x + (b.x - a.x) * (0.3 + Math.random() * 0.4)
  return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b]
}

// Length-matching meander, the zigzag squiggle real PCB routers use to pad trace length.
function meanderRoute(a: Point, b: Point): Point[] {
  const segments = 4 + Math.floor(Math.random() * 3)
  const stepX = (b.x - a.x) / segments
  const amp = 8 + Math.random() * 10
  const pts: Point[] = [a]
  for (let i = 1; i < segments; i++) {
    pts.push({ x: a.x + stepX * i, y: a.y + (i % 2 === 0 ? amp : -amp) })
  }
  pts.push({ x: b.x, y: a.y })
  pts.push(b)
  return pts
}

// Routes past the target before turning back — the "doubles back on itself" case.
function overshootRoute(a: Point, b: Point): Point[] {
  const overshootX = a.x + (b.x - a.x) * (1.2 + Math.random() * 0.3)
  return [a, { x: overshootX, y: a.y }, { x: overshootX, y: b.y }, b]
}

function buildRoute(a: Point, b: Point): Point[] {
  const roll = Math.random()
  if (roll < 0.4) return chamferPath(orthogonalRoute(a, b), CHAMFER_PX)
  if (roll < 0.65) return chamferPath(zRoute(a, b), CHAMFER_PX)
  if (roll < 0.82) return meanderRoute(a, b)
  return chamferPath(overshootRoute(a, b), CHAMFER_PX)
}

function buildTraces(nodes: Point[]) {
  const traces: Trace[] = []
  const adjacency: number[][] = nodes.map(() => [])
  const seen = new Set<string>()

  nodes.forEach((node, i) => {
    const nearest = nodes
      .map((other, j) => ({ j, d: dist(node, other) }))
      .filter((e) => e.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, NEIGHBORS_MIN + Math.floor(Math.random() * (NEIGHBORS_MAX - NEIGHBORS_MIN + 1)))

    for (const { j } of nearest) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)

      const path = buildRoute(node, nodes[j])
      const traceIndex = traces.length
      traces.push({
        a: i,
        b: j,
        path,
        length: pathLength(path),
        bundle: Math.random() < BUNDLE_CHANCE ? 1 + Math.floor(Math.random() * 2) : 0,
      })
      adjacency[i].push(traceIndex)
      adjacency[j].push(traceIndex)
    }
  })

  return { traces, adjacency }
}

// Small clusters of tiny pads near a handful of nodes — reads as an IC footprint
// or header pinout sitting next to a junction.
function buildPadClusters(nodes: Point[]): Point[][] {
  const clusters: Point[][] = []
  for (const node of nodes) {
    if (Math.random() > PAD_CLUSTER_CHANCE) continue
    const cols = 2 + Math.floor(Math.random() * 2)
    const pins: Point[] = []
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        pins.push({ x: node.x - ((cols - 1) * 5) / 2 + c * 5, y: node.y + 9 + r * 5 })
      }
    }
    clusters.push(pins)
  }
  return clusters
}

// A handful of long straight parallel runs crossing the board — the ribbon/data-bus
// look distinct from the organically-routed point-to-point traces.
function buildBuses(width: number, height: number): BusLine[] {
  const buses: BusLine[] = []
  const groups = BUS_GROUPS_MIN + Math.floor(Math.random() * (BUS_GROUPS_MAX - BUS_GROUPS_MIN + 1))
  for (let g = 0; g < groups; g++) {
    const vertical = Math.random() < 0.5
    const lineCount = 4 + Math.floor(Math.random() * 3)
    const base = vertical ? Math.random() * width : Math.random() * height
    const skew = (Math.random() - 0.5) * 140
    for (let l = 0; l < lineCount; l++) {
      const offset = (l - (lineCount - 1) / 2) * 6
      buses.push(
        vertical
          ? { path: [{ x: base + offset, y: 0 }, { x: base + offset + skew, y: height }] }
          : { path: [{ x: 0, y: base + offset }, { x: width, y: base + offset + skew }] },
      )
    }
  }
  return buses
}

function spawnPulse(traces: Trace[]): SignalPulse | null {
  if (traces.length === 0) return null
  const traceIndex = Math.floor(Math.random() * traces.length)
  return {
    traceIndex,
    reverse: Math.random() < 0.5,
    dist: Math.random() * traces[traceIndex].length,
    speed: PULSE_PIXELS_PER_SEC,
  }
}

export function createCircuitScene() {
  let nodes: Point[] = []
  let traces: Trace[] = []
  let adjacency: number[][] = []
  let buses: BusLine[] = []
  let padClusters: Point[][] = []
  let pulses: SignalPulse[] = []
  let rings: ShockRing[] = []
  let gridW = -1
  let gridH = -1
  let cursor: Point = { x: -1000, y: -1000 }

  function ensureCircuit(width: number, height: number) {
    if (gridW === width && gridH === height) return
    gridW = width
    gridH = height
    nodes = placeNodes(width, height)
    const graph = buildTraces(nodes)
    traces = graph.traces
    adjacency = graph.adjacency
    buses = buildBuses(width, height)
    padClusters = buildPadClusters(nodes)
    pulses = []
    for (let i = 0; i < PULSE_COUNT; i++) {
      const pulse = spawnPulse(traces)
      if (pulse) pulses.push(pulse)
    }
    rings = []
  }

  function drawBuses(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = `rgba(${ACCENT}, 0.06)`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const bus of buses) {
      ctx.moveTo(bus.path[0].x, bus.path[0].y)
      ctx.lineTo(bus.path[1].x, bus.path[1].y)
    }
    ctx.stroke()
  }

  function drawTraces(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = `rgba(${ACCENT}, 0.12)`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const trace of traces) {
      for (let copy = 0; copy <= trace.bundle; copy++) {
        const offset = copy === 0 ? 0 : (copy % 2 === 0 ? -1 : 1) * Math.ceil(copy / 2) * 4
        trace.path.forEach((p, i) => {
          const point = offset === 0 ? p : { x: p.x + offset, y: p.y + offset }
          if (i === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
      }
    }
    ctx.stroke()

    ctx.fillStyle = `rgba(${ACCENT}, 0.22)`
    for (const cluster of padClusters) {
      for (const pin of cluster) ctx.fillRect(pin.x - 1, pin.y - 1, 2, 2)
    }

    ctx.fillStyle = `rgba(${ACCENT}, 0.3)`
    for (const node of nodes) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawProximityGlow(ctx: CanvasRenderingContext2D) {
    for (const node of nodes) {
      const d = dist(node, cursor)
      if (d > PROXIMITY_RADIUS) continue
      const strength = 1 - d / PROXIMITY_RADIUS
      ctx.beginPath()
      ctx.arc(node.x, node.y, 5 + strength * 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${ACCENT}, ${strength * 0.85})`
      ctx.lineWidth = 1.5
      ctx.shadowColor = `rgba(${ACCENT}, 1)`
      ctx.shadowBlur = 10 * strength
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }

  function updateAndDrawPulses(ctx: CanvasRenderingContext2D, dtSeconds: number) {
    ctx.lineWidth = 2
    for (const pulse of pulses) {
      const trace = traces[pulse.traceIndex]
      const s = pulse.reverse ? trace.length - pulse.dist : pulse.dist
      const pos = pointAtArcLength(trace.path, s)

      const cursorDist = dist(pos, cursor)
      const attraction = cursorDist < ATTRACT_RADIUS ? 1 + (1 - cursorDist / ATTRACT_RADIUS) * ATTRACT_BOOST : 1

      pulse.dist += pulse.speed * attraction * dtSeconds
      if (pulse.dist >= trace.length) {
        const arrivedNode = pulse.reverse ? trace.a : trace.b
        const options = adjacency[arrivedNode].filter((idx) => idx !== pulse.traceIndex)
        const pool = options.length > 0 ? options : adjacency[arrivedNode]
        const nextIndex = pool[Math.floor(Math.random() * pool.length)]
        const nextTrace = traces[nextIndex]
        pulse.traceIndex = nextIndex
        pulse.reverse = nextTrace.b === arrivedNode
        pulse.dist = 0
        continue
      }

      const glow = cursorDist < ATTRACT_RADIUS ? 0.5 + (1 - cursorDist / ATTRACT_RADIUS) * 0.5 : 0.5
      const trailS = pulse.reverse ? Math.min(s + TRAIL_PX, trace.length) : Math.max(s - TRAIL_PX, 0)
      const trailPos = pointAtArcLength(trace.path, trailS)

      ctx.strokeStyle = `rgba(${ACCENT}, ${glow})`
      ctx.beginPath()
      ctx.moveTo(trailPos.x, trailPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()

      ctx.fillStyle = `rgba(${ACCENT}, ${Math.min(glow + 0.3, 1)})`
      ctx.shadowColor = `rgba(${ACCENT}, 0.9)`
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  function updateAndDrawRings(ctx: CanvasRenderingContext2D, dtMs: number) {
    rings = rings.filter((ring) => {
      ring.radius += (260 * dtMs) / 1000
      ring.life -= dtMs
      return ring.life > 0
    })
    for (const ring of rings) {
      const alpha = ring.life / ring.maxLife
      ctx.strokeStyle = `rgba(${ACCENT}, ${alpha * 0.7})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  function draw(ctx: CanvasRenderingContext2D, dtMs: number, width: number, height: number) {
    ensureCircuit(width, height)
    ctx.clearRect(0, 0, width, height)

    drawBuses(ctx)
    drawTraces(ctx)
    drawProximityGlow(ctx)
    updateAndDrawPulses(ctx, Math.min(dtMs, 48) / 1000)
    updateAndDrawRings(ctx, Math.min(dtMs, 48))
  }

  function handleMouseMove(x: number, y: number) {
    cursor = { x, y }
  }

  function handleMouseLeave() {
    cursor = { x: -1000, y: -1000 }
  }

  function handleClick(x: number, y: number) {
    let nearest = -1
    let nearestDist = CLICK_RADIUS
    nodes.forEach((node, i) => {
      const d = dist(node, { x, y })
      if (d < nearestDist) {
        nearest = i
        nearestDist = d
      }
    })
    if (nearest === -1) return

    const origin = nodes[nearest]
    rings.push({ x: origin.x, y: origin.y, radius: 4, life: 700, maxLife: 700 })
    if (rings.length > MAX_SHOCK_RINGS) rings.shift()

    for (const traceIndex of adjacency[nearest]) {
      const trace = traces[traceIndex]
      pulses.push({ traceIndex, reverse: trace.b === nearest, dist: 0, speed: PULSE_PIXELS_PER_SEC * 2 })
    }
    const overflow = pulses.length - PULSE_COUNT * 2
    if (overflow > 0) pulses.splice(0, overflow)
  }

  return { draw, handleMouseMove, handleMouseLeave, handleClick }
}
