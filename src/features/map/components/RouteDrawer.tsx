import { useState, useCallback } from 'react'
import { useMapEvents, Polyline, CircleMarker } from 'react-leaflet'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { createRoute } from '../services/mapService'
import { getWalkingRoute } from '../services/routingService'
import type { Route } from '../types'
import { toast } from 'sonner'
import { Undo2, Trash2, Save, X, Wand2, MousePointer } from 'lucide-react'

interface RouteDrawerProps {
  onSuccess: () => void
  onCancel: () => void
}

type DrawMode = 'auto' | 'manual'

const ROUTE_TYPES: Array<{ value: Route['type']; label: string }> = [
  { value: 'peatonal', label: 'Peatonal' },
  { value: 'vehicular', label: 'Vehicular' },
  { value: 'bicicleta', label: 'Ciclovía' },
  { value: 'accesible', label: 'Accesible (Rampa)' },
]

const ROUTE_COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#8b5cf6', label: 'Morado' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Gris' },
  { value: '#f97316', label: 'Naranja' },
]

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function RouteDrawer({ onSuccess, onCancel }: RouteDrawerProps) {
  const [mode, setMode] = useState<DrawMode>('auto')
  const [points, setPoints] = useState<Array<[number, number]>>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<Route['type']>('peatonal')
  const [color, setColor] = useState('#3b82f6')
  const [saving, setSaving] = useState(false)
  const [tracing, setTracing] = useState(false)

  // Modo automático: dos clicks → ORS traza el camino
  const [autoStart, setAutoStart] = useState<[number, number] | null>(null)

  // Guardar cuántos puntos había antes de un trazo automático (para deshacer)
  const [pointsBeforeAuto, setPointsBeforeAuto] = useState<number>(0)

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (mode === 'manual') {
      setPoints(prev => [...prev, [lat, lng]])
    } else {
      // Modo auto: primer click = inicio del tramo, segundo = ORS traza
      if (!autoStart) {
        const start: [number, number] = [lat, lng]
        setAutoStart(start)
        // Si ya hay puntos, usar el último como inicio implícito
        if (points.length === 0) {
          setPoints([start])
        }
        toast.info('Ahora haz click en el punto final del tramo')
      } else {
        setTracing(true)
        setPointsBeforeAuto(points.length)
        getWalkingRoute(autoStart, [lat, lng])
          .then(result => {
            // Concatenar al final de los puntos existentes
            setPoints(prev => {
              // Quitar el punto de inicio temporal si coincide con el último existente
              const base = prev.length > 0 ? prev : []
              return [...base, ...result.points]
            })
            toast.success(`Tramo trazado: ${Math.round(result.distance)}m, ~${Math.max(1, Math.round(result.duration / 60))} min`)
          })
          .catch(err => {
            toast.error('No se pudo trazar: ' + (err instanceof Error ? err.message : 'Error'))
            setPoints(prev => [...prev, [lat, lng]])
          })
          .finally(() => {
            setTracing(false)
            setAutoStart(null)
          })
      }
    }
  }, [mode, autoStart, points.length])

  const handleUndo = useCallback(() => {
    if (autoStart) {
      // Cancelar tramo auto en progreso
      setAutoStart(null)
      return
    }
    if (pointsBeforeAuto > 0 && points.length > pointsBeforeAuto) {
      // Deshacer último tramo automático completo
      setPoints(prev => prev.slice(0, pointsBeforeAuto))
      setPointsBeforeAuto(0)
    } else {
      setPoints(prev => prev.slice(0, -1))
    }
  }, [autoStart, points.length, pointsBeforeAuto])

  const handleClear = useCallback(() => {
    setPoints([])
    setAutoStart(null)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (points.length < 2) {
      toast.error('Necesitas al menos 2 puntos')
      return
    }

    setSaving(true)
    try {
      await createRoute({
        name: name.trim(),
        description: description.trim() || undefined,
        points,
        type,
        color,
        width: type === 'vehicular' ? 4 : 3,
        activo: true,
      })
      toast.success('Ruta guardada')
      onSuccess()
    } catch {
      toast.error('Error al guardar la ruta')
    } finally {
      setSaving(false)
    }
  }

  const modeLabel = mode === 'auto'
    ? (autoStart ? 'Click en el punto final del tramo' : (points.length > 0 ? 'Click en el inicio del siguiente tramo' : 'Click en el punto de inicio'))
    : (points.length > 0 ? 'Click para seguir agregando puntos' : 'Click para agregar puntos')

  return (
    <>
      <MapClickHandler onMapClick={handleMapClick} />

      {/* Polilínea en progreso */}
      {points.length >= 2 && (
        <Polyline
          positions={points}
          pathOptions={{
            color,
            weight: 4,
            opacity: 0.8,
            dashArray: mode === 'manual' ? '8, 6' : undefined,
          }}
        />
      )}

      {/* Vértices */}
      {points.length > 0 && (
        <>
          <CircleMarker
            center={points[0]}
            radius={6}
            pathOptions={{ color: 'white', fillColor: '#10b981', fillOpacity: 1, weight: 2 }}
          />
          {points.length > 1 && (
            <CircleMarker
              center={points[points.length - 1]}
              radius={6}
              pathOptions={{ color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
            />
          )}
        </>
      )}

      {/* Punto de inicio en modo auto (esperando segundo click) */}
      {mode === 'auto' && autoStart && points.length === 1 && (
        <CircleMarker
          center={autoStart}
          radius={10}
          pathOptions={{ color: '#10b981', fillColor: '#10b98140', fillOpacity: 0.5, weight: 2, dashArray: '4,4' }}
        />
      )}

      {/* Panel de control */}
      <div className="absolute top-4 right-4 z-[1001] w-72">
        <div className="bg-white rounded-lg shadow-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Dibujar Ruta</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selector de modo */}
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-md">
            <button
              onClick={() => { setMode('auto'); setAutoStart(null) }}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                mode === 'auto' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              <Wand2 className="h-3 w-3" /> Automático
            </button>
            <button
              onClick={() => { setMode('manual'); setAutoStart(null) }}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                mode === 'manual' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              <MousePointer className="h-3 w-3" /> Manual
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {tracing ? '⏳ Trazando camino peatonal...' : modeLabel}
          </p>

          {mode === 'auto' && !autoStart && (
            <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
              {points.length === 0
                ? 'Haz click en el inicio y luego en el final. El sistema trazará el camino peatonal real.'
                : 'Puedes agregar más tramos automáticos o cambiar a Manual para ajustar puntos a mano.'}
            </div>
          )}

          <div className="space-y-2">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Edificio A a Biblioteca"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Descripción</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Opcional..."
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={type} onValueChange={v => setType(v as Route['type'])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTE_COLORS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
            <span>{points.length} punto{points.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-1">
              <Button
                variant="outline" size="sm" className="h-7 text-xs"
                onClick={handleUndo}
                disabled={points.length === 0 || tracing}
              >
                <Undo2 className="h-3 w-3 mr-1" /> Deshacer
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 text-xs text-red-600"
                onClick={handleClear}
                disabled={points.length === 0 || tracing}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-8 text-xs" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              className="flex-1 h-8 text-xs"
              onClick={handleSave}
              disabled={saving || tracing || points.length < 2 || !name.trim()}
            >
              <Save className="h-3 w-3 mr-1" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
