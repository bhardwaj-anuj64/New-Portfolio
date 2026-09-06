import type {
  ChallengeResponse,
  HealthResponse,
  StlJobAccepted,
  TelemetryResponse,
  VerifyResponse,
} from '../types'

export const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : ''

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const getHealth = () => getJson<HealthResponse>('/api/system/health')

export const getTelemetry = () => getJson<TelemetryResponse>('/api/system/telemetry')

export const requestAdminChallenge = async (): Promise<ChallengeResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/challenge`, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`POST /api/admin/challenge failed: ${res.status}`)
  }
  return res.json() as Promise<ChallengeResponse>
}

export const verifyAdminChallenge = async (
  challengeId: string,
  answer: number,
): Promise<VerifyResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, answer }),
  })
  // 401 carries a meaningful { success: false } body here, so parse regardless of status.
  return res.json() as Promise<VerifyResponse>
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
