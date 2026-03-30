import { useState, useEffect, useCallback } from 'react'
import { solverLocalService, type SolverPing } from '../services/solverLocalService'

interface SolverConnection {
  connected: boolean
  version: string | null
  running: boolean
  ping: SolverPing | null
  refresh: () => void
}

export function useSolverConnection(intervalMs = 30000): SolverConnection {
  const [ping, setPing] = useState<SolverPing | null>(null)

  const refresh = useCallback(async () => {
    const result = await solverLocalService.ping()
    setPing(result)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return {
    connected: ping?.status === 'ready' || ping?.status === 'running' || false,
    version: ping?.version || null,
    running: ping?.running || false,
    ping,
    refresh,
  }
}
