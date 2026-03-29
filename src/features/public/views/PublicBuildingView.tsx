import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'
import { BuildingRoomCard, type SalaEdificio } from '../components/BuildingRoomCard'
import {
  Building2, Clock, ChevronLeft, RefreshCw, AlertTriangle,
  Mail, QrCode
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface BloqueInfo {
  id: string
  nombre: string
  hora_inicio: string
  hora_fin: string
  orden: number
}

interface EdificioData {
  id: string
  name: string
  code: string
  pisos: number
  lat: number
  lng: number
  descripcion?: string
}

interface BuildingResponse {
  edificio: EdificioData
  hora_actual: string
  dia_actual: number
  bloque_actual: BloqueInfo | null
  bloque_siguiente: BloqueInfo | null
  salas: SalaEdificio[]
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export function PublicBuildingView() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const [data, setData] = useState<BuildingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const loadData = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<BuildingResponse>>(`/public.php?action=building&id=${buildingId}`)
      if (res.data.data) {
        setData(res.data.data)
        setError(null)
      } else {
        setError('Edificio no encontrado')
      }
    } catch {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [buildingId])

  useEffect(() => {
    loadData()
    // Auto-refresh cada 60 segundos
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando edificio...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/"><Button><ChevronLeft className="h-4 w-4 mr-2" /> Volver</Button></Link>
        </Card>
      </div>
    )
  }

  const { edificio, hora_actual, dia_actual, bloque_actual, bloque_siguiente, salas } = data

  // Agrupar salas por piso
  const pisos = new Map<number, SalaEdificio[]>()
  salas.forEach(s => {
    if (!pisos.has(s.piso)) pisos.set(s.piso, [])
    pisos.get(s.piso)!.push(s)
  })

  const totalAyuda = salas.reduce((acc, s) => acc + s.ayuda_activa.length, 0)
  const salasOcupadas = salas.filter(s => s.horario_actual).length
  const publicUrl = typeof window !== 'undefined' ? window.location.href : ''

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
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {edificio.code} - {edificio.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {hora_actual} - {DIAS[dia_actual]}
                  </span>
                  <span>{salas.length} salas</span>
                  <span>{salasOcupadas} ocupadas</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)}>
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* QR */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <Card className="p-8 text-center max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{edificio.code} - {edificio.name}</h3>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={publicUrl} size={220} level="M" />
            </div>
            <p className="text-xs text-gray-500 break-all">{publicUrl}</p>
            <Button className="mt-4" variant="outline" onClick={() => setShowQR(false)}>Cerrar</Button>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Alerta de ayuda */}
        {totalAyuda > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm">{totalAyuda} pedido{totalAyuda !== 1 ? 's' : ''} de ayuda activo{totalAyuda !== 1 ? 's' : ''}</p>
              <div className="mt-1 space-y-1">
                {salas.filter(s => s.ayuda_activa.length > 0).map(s =>
                  s.ayuda_activa.map(a => (
                    <div key={a.id} className="text-xs text-red-700 flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">{s.code}</Badge>
                      <span className="truncate">{a.mensaje}</span>
                      <a href={`mailto:${a.autor_email}`} className="flex-shrink-0">
                        <Mail className="h-3 w-3" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bloque actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {bloque_actual
                  ? `Ahora: ${bloque_actual.nombre} (${bloque_actual.hora_inicio} - ${bloque_actual.hora_fin})`
                  : 'Sin clases en este momento'}
              </span>
              <Badge variant="outline" className="text-xs">
                {salasOcupadas}/{salas.length} ocupadas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salas.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay salas en este edificio</p>
            ) : (
              <div className="space-y-4">
                {Array.from(pisos.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([piso, salasDelPiso]) => (
                    <div key={piso}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        Piso {piso}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {salasDelPiso.map(sala => (
                          <BuildingRoomCard key={sala.id} sala={sala} variant="actual" />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloque siguiente */}
        {bloque_siguiente && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground">
                Siguiente: {bloque_siguiente.nombre} ({bloque_siguiente.hora_inicio} - {bloque_siguiente.hora_fin})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {salas
                  .filter(s => s.horario_siguiente)
                  .map(sala => (
                    <BuildingRoomCard key={sala.id} sala={sala} variant="siguiente" />
                  ))}
              </div>
              {salas.filter(s => s.horario_siguiente).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-3">No hay clases programadas en el siguiente bloque</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auto-refresh indicator */}
        <p className="text-center text-[10px] text-gray-400">
          Actualizado: {lastRefresh.toLocaleTimeString('es-CL')} · Se actualiza cada 60s
        </p>
      </main>
    </div>
  )
}
