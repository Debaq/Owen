import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { CalendarClock, Plus, Trash2, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getDisponibilidad,
  getCitas,
  saveDisponibilidad,
  crearCitaManual,
  cancelarCita,
  type DisponibilidadInput,
  type Cita,
} from '../services/agendaService'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function AgendaView() {
  const { user } = useAuth()
  const directorId = user?.id || ''

  const [citas, setCitas] = useState<Cita[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Formulario disponibilidad
  const [newSlots, setNewSlots] = useState<DisponibilidadInput[]>([])
  const [newDia, setNewDia] = useState('1')
  const [newInicio, setNewInicio] = useState('09:00')
  const [newFin, setNewFin] = useState('13:00')
  const [newDuracion, setNewDuracion] = useState('30')

  // Modal cita manual
  const [showCitaForm, setShowCitaForm] = useState(false)
  const [citaForm, setCitaForm] = useState({
    fecha: '', hora_inicio: '', hora_fin: '',
    nombre_solicitante: '', email_solicitante: '', motivo: '',
  })

  // Filtro de citas
  const [citaFilter, setCitaFilter] = useState<'todas' | 'confirmada' | 'cancelada'>('confirmada')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [disp, citasData] = await Promise.all([
        getDisponibilidad(directorId),
        getCitas(directorId),
      ])
      setCitas(citasData)

      // Cargar slots existentes para editar
      setNewSlots(disp.map(d => ({
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin,
        duracion_cita: d.duracion_cita,
      })))
    } catch {
      toast.error('Error al cargar agenda')
    } finally {
      setIsLoading(false)
    }
  }, [directorId])

  useEffect(() => { loadData() }, [loadData])

  const handleAddSlot = () => {
    setNewSlots([...newSlots, {
      dia_semana: parseInt(newDia),
      hora_inicio: newInicio,
      hora_fin: newFin,
      duracion_cita: parseInt(newDuracion),
    }])
  }

  const handleRemoveSlot = (index: number) => {
    setNewSlots(newSlots.filter((_, i) => i !== index))
  }

  const handleSaveDisponibilidad = async () => {
    setIsSaving(true)
    try {
      await saveDisponibilidad(directorId, newSlots)
      toast.success('Disponibilidad guardada')
      loadData()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCrearCita = async () => {
    if (!citaForm.fecha || !citaForm.hora_inicio || !citaForm.hora_fin || !citaForm.nombre_solicitante || !citaForm.motivo) {
      toast.error('Complete todos los campos obligatorios')
      return
    }
    try {
      await crearCitaManual({
        director_id: directorId,
        ...citaForm,
      })
      toast.success('Cita creada')
      setShowCitaForm(false)
      setCitaForm({ fecha: '', hora_inicio: '', hora_fin: '', nombre_solicitante: '', email_solicitante: '', motivo: '' })
      loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Error al crear cita')
    }
  }

  const handleCancelarCita = async (id: string) => {
    try {
      await cancelarCita(id)
      toast.success('Cita cancelada')
      loadData()
    } catch {
      toast.error('Error al cancelar')
    }
  }

  const filteredCitas = citaFilter === 'todas'
    ? citas
    : citas.filter(c => c.estado === citaFilter)

  if (isLoading) {
    return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6" /> Mi Agenda
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tu disponibilidad y citas</p>
        </div>
        <Button onClick={() => setShowCitaForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Cita
        </Button>
      </div>

      {/* Disponibilidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Disponibilidad Semanal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slots actuales */}
          {newSlots.length > 0 && (
            <div className="space-y-2">
              {newSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded">
                  <Badge variant="outline">{DIAS[slot.dia_semana]}</Badge>
                  <span className="text-sm">{slot.hora_inicio} - {slot.hora_fin}</span>
                  <Badge variant="secondary" className="text-xs">{slot.duracion_cita || 30} min</Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveSlot(i)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Agregar slot */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Día</Label>
              <Select value={newDia} onValueChange={setNewDia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(d => <SelectItem key={d} value={String(d)}>{DIAS[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="time" value={newInicio} onChange={e => setNewInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="time" value={newFin} onChange={e => setNewFin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duración</Label>
              <Select value={newDuracion} onValueChange={setNewDuracion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddSlot} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveDisponibilidad} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Disponibilidad'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Citas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Citas ({filteredCitas.length})</CardTitle>
            <Select value={citaFilter} onValueChange={(v) => setCitaFilter(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="confirmada">Confirmadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCitas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay citas</p>
          ) : (
            <div className="space-y-2">
              {filteredCitas.map(cita => (
                <div key={cita.id} className={`flex items-center justify-between p-3 rounded border ${cita.estado === 'cancelada' ? 'opacity-50 bg-red-50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-muted-foreground">{cita.fecha}</div>
                      <div className="text-sm font-bold">{cita.hora_inicio}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-sm">{cita.nombre_solicitante}</span>
                        <Badge variant={cita.estado === 'confirmada' ? 'default' : 'destructive'} className="text-xs">
                          {cita.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{cita.motivo}</p>
                      {cita.email_solicitante && <p className="text-xs text-gray-400">{cita.email_solicitante}</p>}
                    </div>
                  </div>
                  {cita.estado === 'confirmada' && (
                    <Button variant="ghost" size="sm" onClick={() => handleCancelarCita(cita.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal cita manual */}
      <Dialog open={showCitaForm} onOpenChange={setShowCitaForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cita Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" value={citaForm.fecha} onChange={e => setCitaForm({...citaForm, fecha: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Inicio *</Label>
                <Input type="time" value={citaForm.hora_inicio} onChange={e => setCitaForm({...citaForm, hora_inicio: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Fin *</Label>
                <Input type="time" value={citaForm.hora_fin} onChange={e => setCitaForm({...citaForm, hora_fin: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nombre del solicitante *</Label>
              <Input value={citaForm.nombre_solicitante} onChange={e => setCitaForm({...citaForm, nombre_solicitante: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={citaForm.email_solicitante} onChange={e => setCitaForm({...citaForm, email_solicitante: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <textarea className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm" value={citaForm.motivo} onChange={e => setCitaForm({...citaForm, motivo: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCitaForm(false)}>Cancelar</Button>
              <Button onClick={handleCrearCita}>Crear Cita</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
