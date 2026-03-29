import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ScheduleGrid } from '../components/ScheduleGrid'
import { ScheduleForm } from '../components/ScheduleForm'
import { ScheduleProgress } from '../components/ScheduleProgress'
import type { HorarioWithDetails } from '../services/scheduleService'
import {
  getSchedulesByRoom,
  getSchedulesByTeacher,
  getSchedulesByLevel,
  getSchedulesBySubject,
  getAllCareers,
  getLevelsByCareer,
  getSubjectsByLevel,
  getAllTeachers,
  getAllActiveRooms,
  getActiveTemporada,
  deleteSchedule,
  DIAS_SEMANA
} from '../services/scheduleService'
import type { Carrera, Nivel, Asignatura, Docente, Sala, BloqueHorario } from '@/shared/types'
import { Building2, Users, BookOpen, GraduationCap, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type ViewType = 'room' | 'teacher' | 'level' | 'subject'

export function SchedulesView() {
  const [viewType, setViewType] = useState<ViewType>('room')
  const [schedules, setSchedules] = useState<HorarioWithDetails[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<HorarioWithDetails | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{dia: number, bloque: BloqueHorario} | null>(null)

  // Datos para filtros
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [temporadaActiva, setTemporadaActiva] = useState<any>(null)

  // Selecciones
  const [selectedCarrera, setSelectedCarrera] = useState<string>('')
  const [selectedNivel, setSelectedNivel] = useState<string>('')
  const [selectedAsignatura, setSelectedAsignatura] = useState<string>('')
  const [selectedDocente, setSelectedDocente] = useState<string>('')
  const [selectedSala, setSelectedSala] = useState<string>('')

  const loadSchedules = async () => {
    if (!temporadaActiva) return

    let data: HorarioWithDetails[] = []

    try {
      switch (viewType) {
        case 'room':
          if (selectedSala) {
            data = await getSchedulesByRoom(selectedSala, temporadaActiva.id)
          }
          break
        case 'teacher':
          if (selectedDocente) {
            data = await getSchedulesByTeacher(selectedDocente, temporadaActiva.id)
          }
          break
        case 'level':
          if (selectedNivel) {
            data = await getSchedulesByLevel(selectedNivel, temporadaActiva.id)
          }
          break
        case 'subject':
          if (selectedAsignatura) {
            data = await getSchedulesBySubject(selectedAsignatura, temporadaActiva.id)
          }
          break
      }

      setSchedules(data)
    } catch (error) {
      console.error('Error loading schedules:', error)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      const [carrerasData, docentesData, salasData, temporada] = await Promise.all([
        getAllCareers(),
        getAllTeachers(),
        getAllActiveRooms(),
        getActiveTemporada(),
      ])

      setCarreras(carrerasData)
      setDocentes(docentesData)
      setSalas(salasData)
      setTemporadaActiva(temporada)

      // Seleccionar primera sala por defecto
      if (salasData.length > 0) {
        setSelectedSala(salasData[0].id)
      }
    }

    loadData()
  }, [])

  // Cargar niveles cuando cambia la carrera
  useEffect(() => {
    if (selectedCarrera) {
      const loadNiveles = async () => {
        const data = await getLevelsByCareer(selectedCarrera)
        setNiveles(data)
        if (data.length > 0 && viewType === 'level') {
          setSelectedNivel(data[0].id)
        }
      }
      loadNiveles()
    } else {
      setNiveles([])
      setAsignaturas([])
    }
  }, [selectedCarrera, viewType])

  // Cargar asignaturas cuando cambia el nivel
  useEffect(() => {
    if (selectedNivel) {
      const loadAsignaturas = async () => {
        const data = await getSubjectsByLevel(selectedNivel)
        setAsignaturas(data)
        if (data.length > 0 && viewType === 'subject') {
          setSelectedAsignatura(data[0].id)
        }
      }
      loadAsignaturas()
    } else {
      setAsignaturas([])
    }
  }, [selectedNivel, viewType])

  // Cargar horarios según el tipo de vista y selección
  useEffect(() => {
    loadSchedules()
  }, [viewType, selectedSala, selectedDocente, selectedNivel, selectedAsignatura, temporadaActiva])

  const handleScheduleClick = (schedule: HorarioWithDetails) => {
    setSelectedSchedule(schedule)
    setDetailsOpen(true)
  }

  const handleCellClick = (dia: number, bloque: BloqueHorario) => {
    setSelectedCell({ dia, bloque })
    setIsCreateOpen(true)
  }

  const handleCreateSuccess = () => {
    setIsCreateOpen(false)
    loadSchedules()
  }

  const handleDelete = async () => {
    if (!selectedSchedule) return
    if (!confirm('¿Estás seguro de eliminar este horario?')) return

    try {
      await deleteSchedule(selectedSchedule.id)
      toast.success('Horario eliminado')
      setDetailsOpen(false)
      loadSchedules()
    } catch (error) {
      toast.error('Error al eliminar horario')
    }
  }

  const handleViewTypeChange = (newViewType: ViewType) => {
    setViewType(newViewType)

    // Reset selecciones según el nuevo tipo
    switch (newViewType) {
      case 'room':
        if (salas.length > 0) setSelectedSala(salas[0].id)
        break
      case 'teacher':
        if (docentes.length > 0) setSelectedDocente(docentes[0].id)
        break
      case 'level':
        if (carreras.length > 0) setSelectedCarrera(carreras[0].id)
        break
      case 'subject':
        if (carreras.length > 0) setSelectedCarrera(carreras[0].id)
        break
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Horarios</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza los horarios por sala, docente, nivel o asignatura
        </p>
        {temporadaActiva && (
          <p className="text-sm text-muted-foreground mt-1">
            Temporada activa: <span className="font-semibold">{temporadaActiva.nombre}</span>
          </p>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona el tipo de vista y los filtros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de tipo de vista */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => handleViewTypeChange('room')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                viewType === 'room'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Por Sala</span>
            </button>

            <button
              onClick={() => handleViewTypeChange('teacher')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                viewType === 'teacher'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Por Docente</span>
            </button>

            <button
              onClick={() => handleViewTypeChange('level')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                viewType === 'level'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              <span className="font-medium">Por Nivel</span>
            </button>

            <button
              onClick={() => handleViewTypeChange('subject')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                viewType === 'subject'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Por Asignatura</span>
            </button>
          </div>

          {/* Filtros dinámicos según el tipo de vista */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {viewType === 'room' && (
              <div className="space-y-2">
                <Label>Sala</Label>
                <Select value={selectedSala} onValueChange={setSelectedSala}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {salas.map(sala => (
                      <SelectItem key={sala.id} value={sala.id}>
                        {sala.code} - {sala.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewType === 'teacher' && (
              <div className="space-y-2">
                <Label>Docente</Label>
                <Select value={selectedDocente} onValueChange={setSelectedDocente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione docente" />
                  </SelectTrigger>
                  <SelectContent>
                    {docentes.map(docente => (
                      <SelectItem key={docente.id} value={docente.id}>
                        {docente.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(viewType === 'level' || viewType === 'subject') && (
              <>
                <div className="space-y-2">
                  <Label>Carrera</Label>
                  <Select value={selectedCarrera} onValueChange={setSelectedCarrera}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione carrera" />
                    </SelectTrigger>
                    <SelectContent>
                      {carreras.map(carrera => (
                        <SelectItem key={carrera.id} value={carrera.id}>
                          {carrera.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nivel</Label>
                  <Select
                    value={selectedNivel}
                    onValueChange={setSelectedNivel}
                    disabled={!selectedCarrera}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {niveles.map(nivel => (
                        <SelectItem key={nivel.id} value={nivel.id}>
                          {nivel.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {viewType === 'subject' && (
                  <div className="space-y-2">
                    <Label>Asignatura</Label>
                    <Select
                      value={selectedAsignatura}
                      onValueChange={setSelectedAsignatura}
                      disabled={!selectedNivel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione asignatura" />
                      </SelectTrigger>
                      <SelectContent>
                        {asignaturas.map(asignatura => (
                          <SelectItem key={asignatura.id} value={asignatura.id}>
                            {asignatura.code} - {asignatura.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Grilla de horarios */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Horario Semanal</CardTitle>
            <CardDescription>
              {schedules.length} {schedules.length === 1 ? 'clase programada' : 'clases programadas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScheduleGrid 
              schedules={schedules} 
              onScheduleClick={handleScheduleClick}
              onCellClick={handleCellClick}
            />
          </CardContent>
        </Card>

        {/* Panel de Progreso (Solo visible en vista por Nivel o Asignatura) */}
        {(viewType === 'level' || viewType === 'subject') && selectedNivel && (
          <div className="lg:col-span-1">
            <ScheduleProgress asignaturas={asignaturas} horarios={schedules} />
          </div>
        )}
      </div>

      {/* Modal de creación */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programar Clase</DialogTitle>
            <DialogDescription>
              {selectedCell && (
                <span>
                  {DIAS_SEMANA[selectedCell.dia]} - {selectedCell.bloque.nombre} ({selectedCell.bloque.hora_inicio} - {selectedCell.bloque.hora_fin})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedCell && temporadaActiva && (
            <ScheduleForm
              dia={selectedCell.dia}
              bloque={selectedCell.bloque}
              temporadaId={temporadaActiva.id}
              initialSalaId={viewType === 'room' ? selectedSala : undefined}
              initialDocenteId={viewType === 'teacher' ? selectedDocente : undefined}
              initialNivelId={viewType === 'level' ? selectedNivel : undefined}
              onSuccess={handleCreateSuccess}
              onCancel={() => setIsCreateOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de detalles */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <DialogTitle>Detalles del Horario</DialogTitle>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </Button>
            </div>
            <DialogDescription>Información detallada de la sesión programada.</DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              {selectedSchedule.asignatura && (
                <div>
                  <p className="text-sm text-muted-foreground">Asignatura</p>
                  <p className="font-semibold text-primary">
                    {selectedSchedule.asignatura.code} - {selectedSchedule.asignatura.name}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedSchedule.docente && (
                    <div>
                    <p className="text-sm text-muted-foreground">Docente</p>
                    <p className="font-semibold">{selectedSchedule.docente.name}</p>
                    </div>
                )}

                {selectedSchedule.sala && (
                    <div>
                    <p className="text-sm text-muted-foreground">Sala</p>
                    <p className="font-semibold">
                        {selectedSchedule.sala.code} - {selectedSchedule.sala.name}
                    </p>
                    </div>
                )}
              </div>

              {selectedSchedule.bloque && (
                <div>
                  <p className="text-sm text-muted-foreground">Horario</p>
                  <p className="font-semibold">
                    {DIAS_SEMANA[selectedSchedule.dia_semana]}: {selectedSchedule.bloque.nombre} ({selectedSchedule.bloque.hora_inicio} -{' '}
                    {selectedSchedule.bloque.hora_fin})
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">Recurrencia</p>
                    <Badge variant="outline" className="capitalize">{selectedSchedule.recurrencia}</Badge>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge variant="secondary" className="capitalize">{selectedSchedule.tipo}</Badge>
                </div>
              </div>

              {selectedSchedule.observaciones && (
                <div>
                  <p className="text-sm text-muted-foreground">Observaciones</p>
                  <p className="text-sm italic">"{selectedSchedule.observaciones}"</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
