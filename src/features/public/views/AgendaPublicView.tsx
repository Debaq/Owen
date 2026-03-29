import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { ArrowLeft, CalendarClock, Check, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSlots,
  reservarCita,
  type Slot,
} from '@/features/agenda/services/agendaService'
import { api } from '@/shared/lib/api'

export function AgendaPublicView() {
  const { directorId } = useParams<{ directorId: string }>()
  const navigate = useNavigate()

  const [directorName, setDirectorName] = useState('')
  const [carreraName, setCarreraName] = useState('')
  const [fecha, setFecha] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Formulario
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [motivo, setMotivo] = useState('')

  // Cargar info del director
  useEffect(() => {
    if (!directorId) return
    api.get(`/agenda.php?action=directores`)
      .then(res => {
        const dirs = res.data.data || []
        const dir = dirs.find((d: any) => d.id === directorId)
        if (dir) {
          setDirectorName(dir.name)
          setCarreraName(dir.carrera_name || '')
        }
      })
      .catch(() => {})
  }, [directorId])

  // Cargar slots cuando cambia la fecha
  useEffect(() => {
    if (!directorId || !fecha) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedSlot(null)
    getSlots(directorId, fecha)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [directorId, fecha])

  const handleReservar = async () => {
    if (!selectedSlot || !nombre || !motivo || !directorId) {
      toast.error('Complete nombre y motivo')
      return
    }

    setIsSubmitting(true)
    try {
      await reservarCita({
        director_id: directorId,
        fecha,
        hora_inicio: selectedSlot.hora_inicio,
        hora_fin: selectedSlot.hora_fin,
        nombre_solicitante: nombre,
        email_solicitante: email || undefined,
        telefono_solicitante: telefono || undefined,
        motivo,
      })
      setSuccess(true)
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al reservar'
      toast.error(msg)
      // Recargar slots por si ya fue tomado
      if (directorId && fecha) {
        getSlots(directorId, fecha).then(setSlots).catch(() => {})
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fecha mínima: hoy
  const today = new Date().toISOString().split('T')[0]

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Cita Agendada</h2>
          <p className="text-gray-600 mb-1">
            <strong>{fecha}</strong> a las <strong>{selectedSlot?.hora_inicio}</strong>
          </p>
          <p className="text-gray-600 mb-4">con <strong>{directorName}</strong></p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/agenda')}>Volver</Button>
            <Button onClick={() => { setSuccess(false); setSelectedSlot(null); setFecha('') }}>Agendar otra</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/agenda')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Agendar Reunión con {directorName || '...'}</h1>
            {carreraName && <p className="text-xs text-gray-500">{carreraName}</p>}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Paso 1: Seleccionar fecha */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> 1. Seleccionar Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} min={today} />
          </CardContent>
        </Card>

        {/* Paso 2: Seleccionar horario */}
        {fecha && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" /> 2. Seleccionar Horario
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="text-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-center py-6 text-gray-400">No hay horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <Button
                      key={slot.hora_inicio}
                      variant={selectedSlot?.hora_inicio === slot.hora_inicio ? 'default' : 'outline'}
                      disabled={!slot.disponible}
                      onClick={() => setSelectedSlot(slot)}
                      className={`${!slot.disponible ? 'line-through opacity-40' : ''}`}
                    >
                      {slot.hora_inicio}
                    </Button>
                  ))}
                </div>
              )}
              {slots.length > 0 && (
                <div className="flex gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border-2 border-gray-300" /> Disponible
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-200 line-through" /> Ocupado
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Paso 3: Datos del solicitante */}
        {selectedSlot && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3. Tus Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <strong>{fecha}</strong> de <strong>{selectedSlot.hora_inicio}</strong> a <strong>{selectedSlot.hora_fin}</strong>
              </div>

              <div className="space-y-1">
                <Label>Nombre completo *</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo de la reunión *</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Describe brevemente el motivo..."
                />
              </div>

              <Button onClick={handleReservar} disabled={isSubmitting || !nombre || !motivo} className="w-full">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reservando...</>
                ) : (
                  <><CalendarClock className="h-4 w-4 mr-2" /> Confirmar Reserva</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
