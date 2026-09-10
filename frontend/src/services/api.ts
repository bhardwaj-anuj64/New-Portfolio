import type {
  AnalyticsStatsResponse,
  ContactResponse,
  HealthResponse,
  OtpChallengeResponse,
  StlJobAccepted,
  TelemetryResponse,
  VerifyResponse,
} from '../types'

// Always relative — the Vite dev server proxies /api and /hubs to the local backend (see
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

export const getHealth = () => getJson<HealthResponse>('/api/system/health')

export const getTelemetry = () => getJson<TelemetryResponse>('/api/system/telemetry')

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

export const createStlJob = async (
  imageData: string,
  gridResolution = 24,
): Promise<StlJobAccepted> => {
  const res = await fetch(`${API_BASE_URL}/api/jobs/stl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, gridResolution }),
  })
  if (!res.ok) {
    throw new Error(`POST /api/jobs/stl failed: ${res.status}`)
  }
  return res.json() as Promise<StlJobAccepted>
}

export const stlResultUrl = (jobId: string) => `${API_BASE_URL}/api/jobs/stl/${jobId}`

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
