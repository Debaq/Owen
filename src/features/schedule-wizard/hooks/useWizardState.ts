import { useState, useCallback, useEffect } from 'react'
import type { Sala } from '@/shared/types'
import { getActiveTemporada } from '@/features/schedules/services/scheduleService'

export interface Temporada {
  id: string
  nombre: string
  tipo: string
  año: number
  fecha_inicio: string
  fecha_fin: string
  sistema_bloque_id?: string
  activa: boolean
}

export interface WizardState {
  currentStep: 1 | 2
  selectedRoom: Sala | null
  temporada: Temporada | null
}

const initialState: WizardState = {
  currentStep: 1,
  selectedRoom: null,
  temporada: null,
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState)

  useEffect(() => {
    getActiveTemporada().then(t => {
      if (t) setState(s => ({ ...s, temporada: t }))
    })
  }, [])

  const set = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState(s => ({ ...s, [key]: value }))
  }, [])

  const goNext = useCallback(() => {
    setState(s => {
      if (s.currentStep < 2) return { ...s, currentStep: 2 as const }
      return s
    })
  }, [])

  const goBack = useCallback(() => {
    setState(s => {
      if (s.currentStep > 1) return { ...s, currentStep: 1 as const }
      return s
    })
  }, [])

  const reset = useCallback(() => {
    setState(s => ({ ...initialState, temporada: s.temporada }))
  }, [])

  const canGoNext = (): boolean => {
    if (state.currentStep === 1) return state.selectedRoom !== null
    return false
  }

  return { state, set, goNext, goBack, reset, canGoNext }
}
