const SOLVER_URL = 'http://localhost:9377'

export interface SolverPing {
  status: string
  version: string
  server_url?: string
  connected: boolean
  running: boolean
}

export interface SolverProgress {
  phase: string
  progress: number
  score: number | null
  message: string
  sessions_assigned: number | null
  sessions_total: number | null
}

export interface SolverRunConfig {
  server_url: string
  token: string
  temporada_id: string
  config?: {
    tiempo_max_seg?: number
    pesos?: Record<string, number>
  }
}

export const solverLocalService = {
  async ping(): Promise<SolverPing | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)
      const res = await fetch(`${SOLVER_URL}/ping`, { signal: controller.signal })
      clearTimeout(timeout)
      return res.json()
    } catch {
      return null
    }
  },

  async run(config: SolverRunConfig): Promise<{ message: string; status: string }> {
    const res = await fetch(`${SOLVER_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || `Error ${res.status}`)
    }
    return res.json()
  },

  async getProgress(): Promise<SolverProgress> {
    const res = await fetch(`${SOLVER_URL}/progress`)
    return res.json()
  },

  async getResult(): Promise<unknown> {
    const res = await fetch(`${SOLVER_URL}/result`)
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Sin resultado')
    }
    return res.json()
  },

  async push(): Promise<unknown> {
    const res = await fetch(`${SOLVER_URL}/push`, { method: 'POST' })
    return res.json()
  },

  async cancel(): Promise<void> {
    await fetch(`${SOLVER_URL}/cancel`, { method: 'POST' })
  },
}
