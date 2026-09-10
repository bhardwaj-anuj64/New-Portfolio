import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
}

export interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export interface FeatureCardData {
  icon: LucideIcon
  title: string
  description: string
}

export interface EnterpriseSkill {
  icon: LucideIcon
  name: string
  impact: string
}

export interface ShowcaseProject {
  title: string
  description: string
  tags: string[]
  repoUrl: string
  demoUrl: string
}

export interface TinkeringSkill {
  icon: LucideIcon
  name: string
  notes: string
}

export interface TinkeringSkillGroup {
  title: string
  skills: TinkeringSkill[]
}

export interface ServerNodeStatus {
  name: string
  status: 'online' | 'degraded' | 'offline'
  cpu: number
  memory: number
}

export interface DockerContainerStatus {
  name: string
  status: 'running' | 'stopped' | 'restarting'
  uptime: string
}

export interface ToolShellProps {
  title: string
  leftPane: ReactNode
  rightPane: ReactNode
}

export interface HealthResponse {
  status: string
  uptimeSeconds: number
  memoryUsageMb: number
}

export interface TelemetryResponse {
  cpuUsagePercent: number
  memoryUsageMb: number
  activeServices: number
  timestamp: string
}

export interface OtpChallengeResponse {
  challengeId: string
  expiresAt: string
  deliveryMethod: 'push' | 'console'
}

export interface VerifyResponse {
  success: boolean
  token: string | null
  expiresAt: string | null
}

export interface StlJobAccepted {
  jobId: string
}

export interface JobProgressEvent {
  jobId: string
  percentage: number
  status: string
}

export interface ContactResponse {
  success: boolean
  message: string
}

export interface ErrorLogEntry {
  timestamp: string
  message: string
  source: string | null
}

export interface AnalyticsStatsResponse {
  pageViews: number
  resumeDownloads: number
  recentErrors: ErrorLogEntry[]
}

// ---------------------------------------------------------------------------
// Tool Tracer (Segmentation / Mesh Generator proxy calls, /api/tools/**).
// The tools-service is Python/Pydantic, not the C# gateway, and the proxy is
// a byte-level forwarder — these field names are snake_case to match the
// actual wire format, unlike the rest of this file.
// ---------------------------------------------------------------------------

export type PixelPoint = [number, number]
export type BboxPx = [number, number, number, number]

export interface RectifyResponse {
  rectified_image_b64: string
  px_per_mm: number
}

export interface MaskPreviewResponse {
  mask_png_b64: string
  foreground_px: number
}

export interface IslandOut {
  id: number
  bbox_px: BboxPx
  area_mm2: number
  thumbnail_png_b64: string
}

export interface IslandsResponse {
  islands: IslandOut[]
}

export interface ContourOut {
  id: number
  parent_id: number | null
  is_hole: boolean
  points_mm: [number, number][]
  area_mm2: number
}

export interface FinalizeResponse {
  contours: ContourOut[]
}

export interface MeshResponse {
  stl_b64: string
  vertex_count: number
  face_count: number
  is_watertight: boolean
  non_manifold_edges: number
}

export type ToolTracerStep = 'upload' | 'calibrate' | 'segment' | 'review' | 'organize' | 'preview'

export interface PocketTool {
  islandId: number
  areaMm2: number
  thumbnailPngB64: string
  pocketDepthMm: number
}

export interface QualificationMilestone {
  id: string
  type: 'degree' | 'certification'
  title: string
  institution: string
  date: string
  icon: LucideIcon
  details: string
  skills: string[]
}
