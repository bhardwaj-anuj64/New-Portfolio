import type {
  AnalyticsStatsResponse,
  BandFinalizeResponse,
  BandPreviewResponse,
  BboxPx,
  ContactResponse,
  ContainerStatus,
  FinalizeResponse,
  HealthResponse,
  IslandsResponse,
  MaskPreviewResponse,
  MeshResponse,
  OtpChallengeResponse,
  PixelPoint,
  RectifyResponse,
  TelemetryResponse,
  VerifyResponse,
} from '../types'

// Always relative — the Vite dev server proxies /api to the local backend (see
// vite.config.ts), and production serves both from the same origin. This also means the app
// works when reached from another device on the LAN (e.g. a phone), not just localhost.
export const API_BASE_URL = ''

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`POST ${path} failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const getHealth = () => getJson<HealthResponse>('/api/system/health')

export const getTelemetry = () => getJson<TelemetryResponse>('/api/system/telemetry')

export const getContainers = () => getJson<ContainerStatus[]>('/api/system/containers')

export const generateOtpChallenge = async (): Promise<OtpChallengeResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/challenge/generate`, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`POST /api/admin/challenge/generate failed: ${res.status}`)
  }
  return res.json() as Promise<OtpChallengeResponse>
}

export const verifyOtpChallenge = async (challengeId: string, code: string): Promise<VerifyResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/challenge/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code }),
  })
  // 401 carries a meaningful { success: false } body here, so parse regardless of status.
  return res.json() as Promise<VerifyResponse>
}

export const getVapidPublicKey = async (): Promise<string | null> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/challenge/vapid-public-key`)
  if (!res.ok) return null
  const { publicKey } = (await res.json()) as { publicKey: string }
  return publicKey
}

export const subscribeDevicePush = async (
  token: string,
  subscription: { endpoint: string; p256dh: string; auth: string },
): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/challenge/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(subscription),
  })
  return res.ok
}

// Fire-and-forget: analytics must never break the page it's measuring.
function beacon(path: string, body?: unknown): void {
  void fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {})
}

// Persisted per-browser so repeat visits/refreshes don't inflate the unique-visit count.
function getVisitorId(): string {
  try {
    const existing = localStorage.getItem('visitorId')
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem('visitorId', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export const recordPageView = (): void => beacon('/api/analytics/pageview', { visitorId: getVisitorId() })

export const recordResumeDownload = (): void => beacon('/api/analytics/resume-download')

export const reportClientError = (message: string, source?: string): void =>
  beacon('/api/analytics/error', { message, source })

export const getAnalyticsStats = (token: string) =>
  fetch(`${API_BASE_URL}/api/analytics/stats`, { headers: { Authorization: `Bearer ${token}` } }).then((res) => {
    if (!res.ok) throw new Error(`GET /api/analytics/stats failed: ${res.status}`)
    return res.json() as Promise<AnalyticsStatsResponse>
  })

// Tool Tracer — proxied through the Gateway to the tools-service in the separate
// portfolio-microservices repo (github.com/bhardwaj-anuj64/portfolio-microservices).
// Request/response bodies stay snake_case (see types/index.ts) to match that service's wire
// format directly, rather than translating a byte-for-byte forwarding proxy's JSON.

export const calibrateRectify = (
  imageB64: string,
  corners: PixelPoint[],
  widthMm: number,
  heightMm: number,
  targetPxPerMm = 6,
) =>
  postJson<RectifyResponse>('/api/tools/calibrate/rectify', {
    image_b64: imageB64,
    corners,
    width_mm: widthMm,
    height_mm: heightMm,
    target_px_per_mm: targetPxPerMm,
  })

export const segmentPreviewMagicWand = (imageB64: string, seeds: PixelPoint[], tolerance: number) =>
  postJson<MaskPreviewResponse>('/api/tools/segment/preview/magicwand', {
    method: 'magicwand',
    image_b64: imageB64,
    seeds,
    tolerance,
  })

export const segmentIslands = (
  imageB64: string,
  seeds: PixelPoint[],
  tolerance: number,
  pxPerMm: number,
) =>
  postJson<IslandsResponse>('/api/tools/segment/islands', {
    method: 'magicwand',
    image_b64: imageB64,
    seeds,
    tolerance,
    px_per_mm: pxPerMm,
  })

export const segmentFinalize = (
  imageB64: string,
  seeds: PixelPoint[],
  tolerance: number,
  pxPerMm: number,
  padMm: number,
  includeIds: number[],
) =>
  postJson<FinalizeResponse>('/api/tools/segment/finalize', {
    method: 'magicwand',
    image_b64: imageB64,
    seeds,
    tolerance,
    px_per_mm: pxPerMm,
    pad_mm: padMm,
    include_ids: includeIds,
  })

export const meshFromPockets = (
  tools: { mask_png_b64: string; pocket_depth_mm: number }[],
  blockThicknessMm: number,
  pxPerMm: number,
  maxMeshDim: number,
) =>
  postJson<MeshResponse>('/api/tools/mesh/from_pockets', {
    tools,
    block_thickness_mm: blockThicknessMm,
    px_per_mm: pxPerMm,
    max_mesh_dim: maxMeshDim,
  })

// Keychain Holder — grabcut segmentation, tonal banding, and the assembled-plaque mesh, all
// proxied through the same Gateway route as Tool Tracer's calls above.

export const segmentPreviewGrabCut = (
  imageB64: string,
  bbox: BboxPx,
  fgHints: PixelPoint[],
  bgHints: PixelPoint[],
) =>
  postJson<MaskPreviewResponse>('/api/tools/segment/preview/grabcut', {
    method: 'grabcut',
    image_b64: imageB64,
    bbox,
    fg_hints: fgHints,
    bg_hints: bgHints,
  })

export const segmentFinalizeGrabCut = (
  imageB64: string,
  bbox: BboxPx,
  fgHints: PixelPoint[],
  bgHints: PixelPoint[],
  pxPerMm: number,
  padMm: number,
) =>
  postJson<FinalizeResponse>('/api/tools/segment/finalize', {
    method: 'grabcut',
    image_b64: imageB64,
    bbox,
    fg_hints: fgHints,
    bg_hints: bgHints,
    px_per_mm: pxPerMm,
    pad_mm: padMm,
  })

export const bandPreview = (
  imageB64: string,
  numBands: number,
  minDepthMm: number,
  maxDepthMm: number,
) =>
  postJson<BandPreviewResponse>('/api/tools/band/preview', {
    image_b64: imageB64,
    num_bands: numBands,
    min_depth_mm: minDepthMm,
    max_depth_mm: maxDepthMm,
  })

export const bandFinalize = (
  imageB64: string,
  numBands: number,
  minDepthMm: number,
  maxDepthMm: number,
) =>
  postJson<BandFinalizeResponse>('/api/tools/band/finalize', {
    image_b64: imageB64,
    num_bands: numBands,
    min_depth_mm: minDepthMm,
    max_depth_mm: maxDepthMm,
  })

export const meshFromSilhouette = (
  maskB64: string,
  pxPerMm: number,
  maxMeshDim: number,
  opts: {
    depthMapB64: string | null
    depthScale: number | null
    flatThicknessMm: number
    borderWidthMm: number
    borderHeightMm: number
    barHeightMm: number
    hookCount: number
    holeDiameterMm: number
  },
) =>
  postJson<MeshResponse>('/api/tools/mesh/from_silhouette', {
    mask_png_b64: maskB64,
    px_per_mm: pxPerMm,
    max_mesh_dim: maxMeshDim,
    depth_map_png_b64: opts.depthMapB64,
    depth_scale: opts.depthScale,
    flat_thickness_mm: opts.flatThicknessMm,
    border_width_mm: opts.borderWidthMm,
    border_height_mm: opts.borderHeightMm,
    bar_height_mm: opts.barHeightMm,
    hook_count: opts.hookCount,
    hole_diameter_mm: opts.holeDiameterMm,
  })

export const submitContactForm = async (payload: {
  name: string
  email: string
  message: string
  website?: string
}): Promise<ContactResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`POST /api/contact failed: ${res.status}`)
  }
  return res.json() as Promise<ContactResponse>
}
