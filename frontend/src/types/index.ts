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
