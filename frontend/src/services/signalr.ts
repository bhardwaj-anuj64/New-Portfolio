import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useEffect, useState } from 'react'
import { API_BASE_URL } from './api'
import type { JobProgressEvent } from '../types'

export type JobConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

/** Subscribes to live progress for a job over SignalR. Pass null to stay disconnected. */
export function useJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<JobProgressEvent | null>(null)
  const [connectionState, setConnectionState] = useState<JobConnectionState>('disconnected')

  useEffect(() => {
    setProgress(null)
    if (!jobId) {
      setConnectionState('disconnected')
      return
    }

    setConnectionState('connecting')

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/jobs`)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('ReceiveJobProgress', (id: string, percentage: number, status: string) => {
      if (id === jobId) {
        setProgress({ jobId: id, percentage, status })
      }
    })

    connection.onreconnecting(() => setConnectionState('reconnecting'))
    connection.onreconnected(() => {
      setConnectionState('connected')
      void connection.invoke('JoinJobGroup', jobId)
    })
    connection.onclose(() => setConnectionState('disconnected'))

    let cancelled = false
    connection
      .start()
      .then(() => {
        if (cancelled) return
        setConnectionState('connected')
        return connection.invoke('JoinJobGroup', jobId)
      })
      .catch(() => {
        if (!cancelled) setConnectionState('disconnected')
      })

    return () => {
      cancelled = true
      void connection.stop()
    }
  }, [jobId])

  return { progress, connectionState }
}
