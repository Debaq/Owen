import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { api } from '@/shared/lib/api'
import type { ApiResponse, BloqueHorario } from '@/shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  MapPin, Users, Building2, Clock, User,
  QrCode, MessageSquare, Send, ChevronLeft, Monitor,
  Armchair, Info, Navigation, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { NavigationMap, type RouteInfo } from '../components/NavigationMap'
import { RoomSearchBar, type SearchResultRoom } from '../components/RoomSearchBar'

// @ts-ignore
delete Icon.Default.prototype._getIconUrl
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface RoomData {
  id: string
  code: string
  name: string
  tipo: string
  capacidad: number
  piso: number
  lat: number
  lng: number
  mobiliario: string[]
  equipamiento: string[]
  reglas?: string
  edificio_id: string
  edificio_name: string
  edificio_code: string
  edificio_lat: number
  edificio_lng: number
}

interface ScheduleData {
  id: string
  tipo: string
  dia_semana: number
  bloque_id: string
  asignatura?: { id: string; code: string; name: string }
  docente?: { id: string; name: string }
  bloque?: { id: string; nombre: string; hora_inicio: string; hora_fin: string; dia_semana: number; orden: number }
}

interface Observacion {
  id: string
  tipo: string
  mensaje: string
  autor_nombre: string
  estado: string
  created_at: string
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const TIPO_SALA_LABELS: Record<string, string> = {
  aula: 'Aula',
  laboratorio: 'Laboratorio',
  auditorio: 'Auditorio',
  taller: 'Taller',
  sala_reuniones: 'Sala de Reuniones',
  oficina: 'Oficina',
  biblioteca: 'Biblioteca',
  medioteca: 'Medioteca',
}

export function PublicRoomView() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [schedules, setSchedules] = useState<ScheduleData[]>([])
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [tab, setTab] = useState<'horario' | 'info' | 'comentarios' | 'navegar'>('horario')

  // Navegacion
  const [destinationRoom, setDestinationRoom] = useState<SearchResultRoom | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [routeError, setRouteError] = useState(false)

  // Form de observacion
  const [obsForm, setObsForm] = useState({
    mensaje: '',
    tipo: 'comentario',
    autor_nombre: '',
  })
  const [sending, setSending] = useState(false)

  // Form de ayuda
  const [helpForm, setHelpForm] = useState({ mensaje: '', email: '' })
  const [sendingHelp, setSendingHelp] = useState(false)

  useEffect(() => {
    if (!roomId) return
    loadData()
  }, [roomId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [roomRes, scheduleRes, bloquesRes, obsRes] = await Promise.all([
        api.get<ApiResponse<RoomData>>(`/public.php?action=room&id=${roomId}`),
        api.get<ApiResponse<ScheduleData[]>>(`/public.php?action=schedule&sala_id=${roomId}`),
        api.get<ApiResponse<BloqueHorario[]>>(`/public.php?action=bloques`),
        api.get<ApiResponse<Observacion[]>>(`/observaciones.php?sala_id=${roomId}&public=1`),
      ])

      if (!roomRes.data.data) {
        setError('Sala no encontrada')
        return
      }

      setRoom(roomRes.data.data)
      setSchedules(scheduleRes.data.data || [])
      setBloques(bloquesRes.data.data || [])
      setObservaciones(obsRes.data.data || [])
    } catch (err: any) {
      setError('Error al cargar datos de la sala')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar bloques por orden (franja horaria)
  const rows = useMemo(() => {
    const grouped = new Map<number, {
      orden: number
      nombre: string
      hora_inicio: string
      hora_fin: string
      byDay: Record<number, BloqueHorario>
    }>()

    bloques.forEach(b => {
      if (!grouped.has(b.orden)) {
        grouped.set(b.orden, {
          orden: b.orden,
          nombre: b.nombre,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          byDay: {} as Record<number, BloqueHorario>,
        })
      }
      grouped.get(b.orden)!.byDay[b.dia_semana] = b
    })

    return Array.from(grouped.values()).sort((a, b) => a.orden - b.orden)
  }, [bloques])

  const getScheduleForCell = (dia: number, bloqueId: string) => {
    return schedules.filter(s => s.dia_semana === dia && s.bloque_id === bloqueId)
  }

  const handleSubmitObs = async () => {
    if (!obsForm.mensaje.trim()) {
      toast.error('Escribe un mensaje')
      return
    }

    setSending(true)
    try {
      await api.post('/observaciones.php', {
        sala_id: roomId,
        mensaje: obsForm.mensaje,
        tipo: obsForm.tipo,
        autor_nombre: obsForm.autor_nombre || 'Anonimo',
      })
      toast.success('Comentario enviado')
      setObsForm({ mensaje: '', tipo: 'comentario', autor_nombre: '' })
      // Recargar observaciones
      const obsRes = await api.get<ApiResponse<Observacion[]>>(`/observaciones.php?sala_id=${roomId}&public=1`)
      setObservaciones(obsRes.data.data || [])
    } catch (err) {
      toast.error('Error al enviar comentario')
    } finally {
      setSending(false)
    }
  }

  const handleSubmitHelp = async () => {
    if (!helpForm.mensaje.trim() || !helpForm.email.trim()) {
      toast.error('Mensaje y email son obligatorios')
      return
    }
    setSendingHelp(true)
    try {
      await api.post('/observaciones.php', {
        sala_id: roomId,
        mensaje: helpForm.mensaje,
        tipo: 'ayuda',
        autor_nombre: 'Solicitud de ayuda',
        autor_email: helpForm.email,
      })
      toast.success('Pedido de ayuda enviado')
      setHelpForm({ mensaje: '', email: '' })
    } catch {
      toast.error('Error al enviar pedido')
    } finally {
      setSendingHelp(false)
    }
  }

  const publicUrl = typeof window !== 'undefined' ? window.location.href : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sala...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Sala no encontrada</h2>
          <p className="text-gray-600 mb-4">{error || 'No se encontro la sala solicitada'}</p>
          <Link to="/">
            <Button><ChevronLeft className="h-4 w-4 mr-2" /> Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const mapCenter: [number, number] = room.lat && room.lng
    ? [room.lat, room.lng]
    : [room.edificio_lat, room.edificio_lng]

  const hasValidCoords = (mapCenter[0] !== 0 || mapCenter[1] !== 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold">{room.code} - {room.name}</h1>
                <Link to={`/public/building/${room.edificio_id}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {room.edificio_name} - Piso {room.piso}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQR(!showQR)}
              >
                <QrCode className="h-4 w-4 mr-1" /> QR
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <Card className="p-8 text-center max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{room.code} - {room.name}</h3>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={publicUrl} size={220} level="M" />
            </div>
            <p className="text-xs text-gray-500 break-all">{publicUrl}</p>
            <Button className="mt-4" variant="outline" onClick={() => setShowQR(false)}>Cerrar</Button>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Info rapida */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="font-semibold text-sm">{TIPO_SALA_LABELS[room.tipo] || room.tipo}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Capacidad</p>
                <p className="font-semibold text-sm">{room.capacidad} personas</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ubicacion</p>
                <p className="font-semibold text-sm">{room.edificio_code} - P{room.piso}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Clases</p>
                <p className="font-semibold text-sm">{schedules.length} programadas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('horario')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === 'horario' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-1" /> Horario
          </button>
          <button
            onClick={() => setTab('info')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === 'info' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Info className="h-4 w-4 inline mr-1" /> Info y Mapa
          </button>
          <button
            onClick={() => setTab('comentarios')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === 'comentarios' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-1" /> Comentarios
          </button>
          <button
            onClick={() => setTab('navegar')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === 'navegar' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Navigation className="h-4 w-4 inline mr-1" /> Ir
          </button>
        </div>

        {/* Tab: Horario */}
        {tab === 'horario' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Horario Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 && rows.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay horarios programados para esta sala</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Header */}
                    <div className="grid grid-cols-6 gap-1 mb-1">
                      <div className="text-xs font-semibold text-gray-500 p-2">Bloque</div>
                      {[1, 2, 3, 4, 5].map(dia => (
                        <div key={dia} className="text-center text-xs font-semibold bg-blue-600 text-white p-2 rounded-t">
                          {DIAS[dia]}
                        </div>
                      ))}
                    </div>

                    {/* Rows */}
                    {rows.map(row => (
                      <div key={row.orden} className="grid grid-cols-6 gap-1 mb-1">
                        <div className="bg-gray-100 rounded p-2 flex flex-col justify-center">
                          <div className="text-xs font-semibold">{row.nombre}</div>
                          <div className="text-[10px] text-gray-500">{row.hora_inicio}-{row.hora_fin}</div>
                        </div>
                        {[1, 2, 3, 4, 5].map(dia => {
                          const bloque = row.byDay[dia]
                          if (!bloque) {
                            return <div key={`${dia}-${row.orden}`} className="bg-gray-50 rounded min-h-[60px]" />
                          }

                          const items = getScheduleForCell(dia, bloque.id)
                          return (
                            <div
                              key={`${dia}-${bloque.id}`}
                              className={`rounded min-h-[60px] p-1.5 ${
                                items.length > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                              }`}
                            >
                              {items.map(item => (
                                <div key={item.id} className="text-xs space-y-0.5">
                                  {item.asignatura && (
                                    <div className="font-semibold text-blue-800 leading-tight">
                                      {item.asignatura.code}
                                    </div>
                                  )}
                                  {item.asignatura && (
                                    <div className="text-gray-600 leading-tight line-clamp-2">
                                      {item.asignatura.name}
                                    </div>
                                  )}
                                  {item.docente && (
                                    <div className="text-gray-500 flex items-center gap-0.5">
                                      <User className="h-2.5 w-2.5" /> {item.docente.name}
                                    </div>
                                  )}
                                  {!item.asignatura && (
                                    <Badge variant="secondary" className="text-[10px]">{item.tipo}</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Info y Mapa */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* Mapa */}
            {hasValidCoords && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <MapPin className="h-4 w-4 inline mr-1" /> Ubicacion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border" style={{ height: '300px' }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={18}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={mapCenter}>
                        <Popup>
                          <strong>{room.code}</strong><br />
                          {room.name}<br />
                          {room.edificio_name} - Piso {room.piso}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equipamiento */}
            {room.equipamiento.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Monitor className="h-4 w-4 inline mr-1" /> Equipamiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {room.equipamiento.map((eq, i) => (
                      <Badge key={i} variant="secondary">{eq}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobiliario */}
            {room.mobiliario.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Armchair className="h-4 w-4 inline mr-1" /> Mobiliario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {room.mobiliario.map((mob, i) => (
                      <Badge key={i} variant="outline">{mob}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reglas */}
            {room.reglas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reglas de uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{room.reglas}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Comentarios */}
        {tab === 'comentarios' && (
          <div className="space-y-4">
            {/* Necesito Ayuda */}
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" /> Necesito ayuda en esta sala
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  type="email"
                  placeholder="Tu email (obligatorio para respuesta)"
                  value={helpForm.email}
                  onChange={e => setHelpForm(f => ({ ...f, email: e.target.value }))}
                />
                <Textarea
                  placeholder="Ej: El proyector no enciende, necesito ayuda urgente..."
                  value={helpForm.mensaje}
                  onChange={e => setHelpForm(f => ({ ...f, mensaje: e.target.value }))}
                  rows={2}
                />
                <Button
                  onClick={handleSubmitHelp}
                  disabled={sendingHelp}
                  variant="destructive"
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {sendingHelp ? 'Enviando...' : 'Enviar pedido de ayuda'}
                </Button>
              </CardContent>
            </Card>

            {/* Formulario */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dejar un comentario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Tu nombre (opcional)</Label>
                    <Input
                      placeholder="Anonimo"
                      value={obsForm.autor_nombre}
                      onChange={e => setObsForm(f => ({ ...f, autor_nombre: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Tipo</Label>
                    <Select
                      value={obsForm.tipo}
                      onValueChange={v => setObsForm(f => ({ ...f, tipo: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comentario">Comentario</SelectItem>
                        <SelectItem value="problema">Problema</SelectItem>
                        <SelectItem value="sugerencia">Sugerencia</SelectItem>
                        <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Mensaje</Label>
                  <Textarea
                    placeholder="Escribe tu comentario sobre esta sala..."
                    value={obsForm.mensaje}
                    onChange={e => setObsForm(f => ({ ...f, mensaje: e.target.value }))}
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmitObs} disabled={sending} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Enviando...' : 'Enviar comentario'}
                </Button>
              </CardContent>
            </Card>

            {/* Lista de comentarios */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comentarios recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {observaciones.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No hay comentarios aun. Se el primero en comentar.</p>
                ) : (
                  <div className="space-y-3">
                    {observaciones.map(obs => (
                      <div key={obs.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{obs.autor_nombre || 'Anonimo'}</span>
                            <Badge variant={
                              obs.tipo === 'problema' ? 'destructive' :
                              obs.tipo === 'mantenimiento' ? 'default' :
                              obs.tipo === 'sugerencia' ? 'secondary' : 'outline'
                            } className="text-xs">
                              {obs.tipo}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(obs.created_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{obs.mensaje}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Navegar */}
        {tab === 'navegar' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Navigation className="h-4 w-4 inline mr-1" /> Como llegar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Origen */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
                  <div>
                    <span className="text-xs text-red-600 font-medium">Estas aqui</span>
                    <p className="font-semibold text-sm">{room.code} - {room.name}</p>
                  </div>
                </div>

                {/* Buscador destino */}
                <div>
                  <Label className="text-sm mb-1.5 block">Destino</Label>
                  <RoomSearchBar
                    excludeRoomId={room.id}
                    selectedRoom={destinationRoom}
                    onSelect={(r) => { setDestinationRoom(r); setRouteInfo(null); setRouteError(false) }}
                    onClear={() => { setDestinationRoom(null); setRouteInfo(null); setRouteError(false) }}
                  />
                </div>

                {/* Mapa con ruta */}
                <NavigationMap
                  origin={mapCenter}
                  originLabel={`${room.code} - ${room.name}`}
                  destination={destinationRoom ? [destinationRoom.lat, destinationRoom.lng] : null}
                  destinationLabel={destinationRoom ? `${destinationRoom.code} - ${destinationRoom.name}` : undefined}
                  onRouteFound={(info) => { setRouteInfo(info); setRouteError(false) }}
                  onRouteError={() => setRouteError(true)}
                />

                {/* Info de ruta */}
                {routeInfo && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-xs text-green-700">Distancia</span>
                        <p className="font-bold text-green-800">
                          {routeInfo.distance >= 1000
                            ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                            : `${Math.round(routeInfo.distance)} m`}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-green-700">Tiempo caminando</span>
                        <p className="font-bold text-green-800">~{Math.max(1, Math.round(routeInfo.time / 60))} min</p>
                      </div>
                    </div>
                  </div>
                )}

                {routeError && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    No se pudo calcular la ruta. Verifica que ambas salas tienen ubicacion registrada.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
          <p>Sistema OWEN - Campus Puerto Montt</p>
        </div>
      </footer>
    </div>
  )
}
