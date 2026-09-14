import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import {
  getAllCareers, getLevelsByCareer, getSubjectsByLevel, getAllTeachers, createSchedule,
} from '@/features/schedules/services/scheduleService'
import type { Sala, BloqueHorario, Carrera, Nivel, Asignatura, Docente, RecurrenceType } from '@/shared/types'
import { QuickCreateCarrera } from './QuickCreateCarrera'
import { QuickCreateNivel } from './QuickCreateNivel'
import { QuickCreateAsignatura } from './QuickCreateAsignatura'
import { QuickCreateDocente } from './QuickCreateDocente'
import { Plus, MapPin, Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toast } from 'sonner'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const TIPOS = [
  { value: 'clase', label: 'Clase', color: 'bg-blue-600' },
  { value: 'evento', label: 'Evento', color: 'bg-purple-600' },
  { value: 'examen', label: 'Examen', color: 'bg-orange-600' },
  { value: 'taller', label: 'Taller', color: 'bg-green-600' },
] as const

interface CellAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dia: number
  bloque: BloqueHorario
  room: Sala
  temporadaId: string
  defaultFechaInicio: string
  defaultFechaFin: string
  onSuccess: () => void
}

export function CellAssignmentModal({
  open, onOpenChange, dia, bloque, room, temporadaId,
  defaultFechaInicio, defaultFechaFin, onSuccess,
}: CellAssignmentModalProps) {
  // Estado del formulario
  const [tipo, setTipo] = useState<'clase' | 'evento' | 'examen' | 'taller'>('clase')
  const [selectedCarrera, setSelectedCarrera] = useState<Carrera | null>(null)
  const [selectedNivel, setSelectedNivel] = useState<Nivel | null>(null)
  const [selectedAsignatura, setSelectedAsignatura] = useState<Asignatura | null>(null)
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null)
  const [recurrencia, setRecurrencia] = useState<RecurrenceType>('semanal')
  const [fechaInicio, setFechaInicio] = useState(defaultFechaInicio)
  const [fechaFin, setFechaFin] = useState(defaultFechaFin)
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Maestros
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])

  // Quick-create
  const [showCarrera, setShowCarrera] = useState(false)
  const [showNivel, setShowNivel] = useState(false)
  const [showAsignatura, setShowAsignatura] = useState(false)
  const [showDocente, setShowDocente] = useState(false)

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setTipo('clase')
      setSelectedCarrera(null)
      setSelectedNivel(null)
      setSelectedAsignatura(null)
      setSelectedDocente(null)
      setRecurrencia('semanal')
      setFechaInicio(defaultFechaInicio)
      setFechaFin(defaultFechaFin)
      setObservaciones('')
      setSubmitting(false)
    }
  }, [open, defaultFechaInicio, defaultFechaFin])

  // Cargar maestros
  useEffect(() => {
    if (open) {
      Promise.all([getAllCareers(), getAllTeachers()])
        .then(([c, d]) => { setCarreras(c); setDocentes(d) })
    }
  }, [open])

  // Cascada: niveles
  useEffect(() => {
    if (selectedCarrera) {
      getLevelsByCareer(selectedCarrera.id).then(setNiveles)
    } else {
      setNiveles([])
    }
  }, [selectedCarrera?.id])

  // Cascada: asignaturas
  useEffect(() => {
    if (selectedNivel) {
      getSubjectsByLevel(selectedNivel.id).then(setAsignaturas)
    } else {
      setAsignaturas([])
    }
  }, [selectedNivel?.id])

  const handleCarreraChange = (id: string) => {
    setSelectedCarrera(carreras.find(x => x.id === id) || null)
    setSelectedNivel(null)
    setSelectedAsignatura(null)
  }

  const handleNivelChange = (id: string) => {
    setSelectedNivel(niveles.find(x => x.id === id) || null)
    setSelectedAsignatura(null)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await createSchedule({
        tipo,
        sala_id: room.id,
        bloque_id: bloque.id,
        temporada_id: temporadaId,
        dia_semana: dia,
        recurrencia,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        asignatura_id: selectedAsignatura?.id,
        docente_id: selectedDocente?.id,
        nivel_id: selectedNivel?.id,
        observaciones: observaciones || undefined,
      })
      toast.success('Horario creado correctamente')
      onSuccess()
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al crear horario'
      toast.error(msg)
      setSubmitting(false)
    }
  }

  const isClase = tipo === 'clase'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Programar bloque
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {DIAS[dia]} {bloque.hora_inicio}–{bloque.hora_fin}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {room.code} – {room.name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="grid grid-cols-4 gap-2">
            {TIPOS.map(t => (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={cn(
                  'py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                  tipo === t.value
                    ? `${t.color} text-white border-transparent`
                    : 'border-gray-200 hover:border-gray-400',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Cascada académica */}
          {isClase && (
            <div className="space-y-3 border rounded-lg p-4">
              {/* Carrera */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Carrera</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowCarrera(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Nueva
                  </Button>
                </div>
                <Select value={selectedCarrera?.id || ''} onValueChange={handleCarreraChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar carrera..." /></SelectTrigger>
                  <SelectContent>
                    {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Nivel */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Nivel</Label>
                  {selectedCarrera && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNivel(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Nuevo
                    </Button>
                  )}
                </div>
                <Select value={selectedNivel?.id || ''} onValueChange={handleNivelChange} disabled={!selectedCarrera}>
                  <SelectTrigger><SelectValue placeholder={selectedCarrera ? 'Seleccionar nivel...' : 'Selecciona carrera primero'} /></SelectTrigger>
                  <SelectContent>
                    {niveles.map(n => <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Asignatura */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Asignatura</Label>
                  {selectedNivel && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAsignatura(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Nueva
                    </Button>
                  )}
                </div>
                <Select
                  value={selectedAsignatura?.id || ''}
                  onValueChange={id => setSelectedAsignatura(asignaturas.find(x => x.id === id) || null)}
                  disabled={!selectedNivel}
                >
                  <SelectTrigger><SelectValue placeholder={selectedNivel ? 'Seleccionar asignatura...' : 'Selecciona nivel primero'} /></SelectTrigger>
                  <SelectContent>
                    {asignaturas.map(a => <SelectItem key={a.id} value={a.id}>{a.code} – {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Docente */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Docente (opcional)</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowDocente(true)}>
                <Plus className="h-3 w-3 mr-1" /> Nuevo
              </Button>
            </div>
            <Select
              value={selectedDocente?.id || ''}
              onValueChange={id => setSelectedDocente(docentes.find(x => x.id === id) || null)}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar docente..." /></SelectTrigger>
              <SelectContent>
                {docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Recurrencia + Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-sm">Recurrencia</Label>
              <Select value={recurrencia} onValueChange={v => setRecurrencia(v as RecurrenceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="unica">Única vez</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Fecha inicio</Label>
              <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Fecha fin</Label>
              <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-1">
            <Label className="text-sm">Observaciones</Label>
            <Textarea
              placeholder="Notas adicionales..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>

        {/* Quick-create dialogs */}
        <QuickCreateCarrera
          open={showCarrera}
          onOpenChange={setShowCarrera}
          onCreated={(c) => { setCarreras(prev => [...prev, c]); setSelectedCarrera(c); setSelectedNivel(null); setSelectedAsignatura(null) }}
        />
        {selectedCarrera && (
          <QuickCreateNivel
            open={showNivel}
            onOpenChange={setShowNivel}
            carreraId={selectedCarrera.id}
            onCreated={(n) => { setNiveles(prev => [...prev, n]); setSelectedNivel(n); setSelectedAsignatura(null) }}
          />
        )}
        {selectedCarrera && selectedNivel && (
          <QuickCreateAsignatura
            open={showAsignatura}
            onOpenChange={setShowAsignatura}
            carreraId={selectedCarrera.id}
            nivelId={selectedNivel.id}
            onCreated={(a) => { setAsignaturas(prev => [...prev, a]); setSelectedAsignatura(a) }}
          />
        )}
        <QuickCreateDocente
          open={showDocente}
          onOpenChange={setShowDocente}
          carreraId={selectedCarrera?.id}
          onCreated={(d) => { setDocentes(prev => [...prev, d]); setSelectedDocente(d) }}
        />
      </DialogContent>
    </Dialog>
  )
}
