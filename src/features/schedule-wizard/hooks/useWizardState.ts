import { useState, useCallback, useEffect } from 'react'
import type { Sala, BloqueHorario, Carrera, Nivel, Asignatura, Docente } from '@/shared/types'
import type { RecurrenceType } from '@/shared/types'
import { getActiveTemporada, createSchedule } from '@/features/schedules/services/scheduleService'
import { toast } from 'sonner'

interface Temporada {
  id: string
  nombre: string
  tipo: string
  año: number
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
}

export interface WizardState {
  currentStep: 1 | 2 | 3
  // Paso 1
  selectedRoom: Sala | null
  // Paso 2
  selectedDay: number | null
  selectedBlock: BloqueHorario | null
  temporada: Temporada | null
  recurrencia: RecurrenceType
  fechaInicio: string
  fechaFin: string
  // Paso 3
  tipo: 'clase' | 'evento' | 'examen' | 'taller'
  selectedCarrera: Carrera | null
  selectedNivel: Nivel | null
  selectedAsignatura: Asignatura | null
  selectedDocente: Docente | null
  observaciones: string
  // UI
  submitting: boolean
  submitted: boolean
}

const today = new Date().toISOString().split('T')[0]
const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]

const initialState: WizardState = {
  currentStep: 1,
  selectedRoom: null,
  selectedDay: null,
  selectedBlock: null,
  temporada: null,
  recurrencia: 'semanal',
  fechaInicio: today,
  fechaFin: yearEnd,
  tipo: 'clase',
  selectedCarrera: null,
  selectedNivel: null,
  selectedAsignatura: null,
  selectedDocente: null,
  observaciones: '',
  submitting: false,
  submitted: false,
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState)

  // Cargar temporada activa al montar
  useEffect(() => {
    getActiveTemporada().then(t => {
      if (t) {
        setState(s => ({
          ...s,
          temporada: t,
          fechaInicio: t.fecha_inicio || today,
          fechaFin: t.fecha_fin || yearEnd,
        }))
      }
    })
  }, [])

  const set = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState(s => ({ ...s, [key]: value }))
  }, [])

  const goNext = useCallback(() => {
    setState(s => {
      if (s.currentStep < 3) return { ...s, currentStep: (s.currentStep + 1) as 1 | 2 | 3 }
      return s
    })
  }, [])

  const goBack = useCallback(() => {
    setState(s => {
      if (s.currentStep > 1) return { ...s, currentStep: (s.currentStep - 1) as 1 | 2 | 3 }
      return s
    })
  }, [])

  const reset = useCallback(() => {
    setState(s => ({ ...initialState, temporada: s.temporada }))
  }, [])

  const canGoNext = (): boolean => {
    switch (state.currentStep) {
      case 1: return state.selectedRoom !== null
      case 2: return state.selectedDay !== null && state.selectedBlock !== null && state.temporada !== null
      case 3: return true
      default: return false
    }
  }

  const submit = useCallback(async () => {
    if (!state.selectedRoom || !state.selectedBlock || !state.temporada || !state.selectedDay) {
      toast.error('Faltan datos requeridos')
      return false
    }

    setState(s => ({ ...s, submitting: true }))
    try {
      await createSchedule({
        tipo: state.tipo,
        sala_id: state.selectedRoom.id,
        bloque_id: state.selectedBlock.id,
        temporada_id: state.temporada.id,
        dia_semana: state.selectedDay,
        recurrencia: state.recurrencia,
        fecha_inicio: state.fechaInicio,
        fecha_fin: state.fechaFin,
        asignatura_id: state.selectedAsignatura?.id,
        docente_id: state.selectedDocente?.id,
        nivel_id: state.selectedNivel?.id,
        observaciones: state.observaciones || undefined,
      })
      toast.success('Horario creado correctamente')
      setState(s => ({ ...s, submitting: false, submitted: true }))
      return true
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al crear horario'
      toast.error(msg)
      setState(s => ({ ...s, submitting: false }))
      return false
    }
  }, [state])

  return { state, set, goNext, goBack, reset, canGoNext, submit }
}
