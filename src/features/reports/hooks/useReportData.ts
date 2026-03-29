import { useState, useEffect, useCallback } from 'react'
import type { Carrera, Nivel, Asignatura, Docente, Sala, BloqueHorario } from '@/shared/types'
import type { HorarioWithDetails } from '@/features/schedules/services/scheduleService'
import {
  getSchedulesByRoom,
  getSchedulesByTeacher,
  getSchedulesByLevel,
  getSchedulesBySubject,
  getAllBlocks,
  getAllCareers,
  getLevelsByCareer,
  getSubjectsByLevel,
  getAllTeachers,
  getAllActiveRooms,
  getActiveTemporada,
} from '@/features/schedules/services/scheduleService'
import type { ReportType } from '../services/reportExportService'

export interface Temporada {
  id: string
  nombre: string
  activa: boolean
}

export function useReportData() {
  const [reportType, setReportType] = useState<ReportType>('room')

  // Referencia
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [temporadaActiva, setTemporadaActiva] = useState<Temporada | null>(null)

  // Selecciones
  const [selectedCarrera, setSelectedCarrera] = useState('')
  const [selectedNivel, setSelectedNivel] = useState('')
  const [selectedAsignatura, setSelectedAsignatura] = useState('')
  const [selectedDocente, setSelectedDocente] = useState('')
  const [selectedSala, setSelectedSala] = useState('')

  // Resultado
  const [schedules, setSchedules] = useState<HorarioWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Cargar datos base
  useEffect(() => {
    async function load() {
      try {
        const [c, d, s, t, b] = await Promise.all([
          getAllCareers(),
          getAllTeachers(),
          getAllActiveRooms(),
          getActiveTemporada(),
          getAllBlocks(),
        ])
        setCarreras(c)
        setDocentes(d)
        setSalas(s)
        setTemporadaActiva(t)
        setBloques(b)
      } catch (err) {
        console.error('Error cargando datos base:', err)
      } finally {
        setIsInitialLoading(false)
      }
    }
    load()
  }, [])

  // Cascading: carrera → niveles
  useEffect(() => {
    if (!selectedCarrera) {
      setNiveles([])
      setSelectedNivel('')
      setAsignaturas([])
      setSelectedAsignatura('')
      return
    }
    getLevelsByCareer(selectedCarrera)
      .then(setNiveles)
      .catch(() => setNiveles([]))
  }, [selectedCarrera])

  // Cascading: nivel → asignaturas
  useEffect(() => {
    if (!selectedNivel) {
      setAsignaturas([])
      setSelectedAsignatura('')
      return
    }
    getSubjectsByLevel(selectedNivel)
      .then(setAsignaturas)
      .catch(() => setAsignaturas([]))
  }, [selectedNivel])

  // Limpiar selecciones al cambiar tipo
  useEffect(() => {
    setSelectedCarrera('')
    setSelectedNivel('')
    setSelectedAsignatura('')
    setSelectedDocente('')
    setSelectedSala('')
    setSchedules([])
  }, [reportType])

  // Cargar horarios cuando cambia la selección activa
  const loadSchedules = useCallback(async () => {
    if (!temporadaActiva) return

    let entityId = ''
    switch (reportType) {
      case 'room': entityId = selectedSala; break
      case 'teacher': entityId = selectedDocente; break
      case 'level': entityId = selectedNivel; break
      case 'subject': entityId = selectedAsignatura; break
    }

    if (!entityId) {
      setSchedules([])
      return
    }

    setIsLoading(true)
    try {
      let data: HorarioWithDetails[] = []
      switch (reportType) {
        case 'room':
          data = await getSchedulesByRoom(entityId, temporadaActiva.id)
          break
        case 'teacher':
          data = await getSchedulesByTeacher(entityId, temporadaActiva.id)
          break
        case 'level':
          data = await getSchedulesByLevel(entityId, temporadaActiva.id)
          break
        case 'subject':
          data = await getSchedulesBySubject(entityId, temporadaActiva.id)
          break
      }
      setSchedules(data)
    } catch (err) {
      console.error('Error cargando horarios:', err)
      setSchedules([])
    } finally {
      setIsLoading(false)
    }
  }, [reportType, selectedSala, selectedDocente, selectedNivel, selectedAsignatura, temporadaActiva])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  // Label de la entidad seleccionada
  const entityLabel = (() => {
    switch (reportType) {
      case 'room': {
        const sala = salas.find(s => s.id === selectedSala)
        return sala ? sala.code + ' - ' + sala.name : ''
      }
      case 'teacher': {
        const doc = docentes.find(d => d.id === selectedDocente)
        return doc ? doc.name : ''
      }
      case 'level': {
        const nivel = niveles.find(n => n.id === selectedNivel)
        const carrera = carreras.find(c => c.id === selectedCarrera)
        if (nivel && carrera) return nivel.nombre + ' - ' + carrera.name
        if (nivel) return nivel.nombre
        return ''
      }
      case 'subject': {
        const asig = asignaturas.find(a => a.id === selectedAsignatura)
        return asig ? asig.code + ' - ' + asig.name : ''
      }
      default:
        return ''
    }
  })()

  return {
    reportType,
    setReportType,
    // Filtros
    selectedCarrera, setSelectedCarrera,
    selectedNivel, setSelectedNivel,
    selectedAsignatura, setSelectedAsignatura,
    selectedDocente, setSelectedDocente,
    selectedSala, setSelectedSala,
    // Datos de referencia
    carreras, niveles, asignaturas, docentes, salas, bloques,
    temporadaActiva,
    // Resultado
    schedules,
    entityLabel,
    isLoading,
    isInitialLoading,
  }
}
