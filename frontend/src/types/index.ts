import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type Perspective = 'professional' | 'tinkerer'

export interface SegmentedControlOption {
  label: string
  value: string
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
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

export interface ChallengeResponse {
  challengeId: string
  prompt: string
  expiresAt: string
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
