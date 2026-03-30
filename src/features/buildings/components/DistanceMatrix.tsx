import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import { getDistances, updateDistance, generateDistances } from '../services/distanceService'
import type { Edificio, DistanciaEdificio } from '@/shared/types'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

export function DistanceMatrix() {
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [distancias, setDistancias] = useState<DistanciaEdificio[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [edRes, distRes] = await Promise.all([
        api.get<ApiResponse<Edificio[]>>('/edificios.php'),
        getDistances()
      ])
      setEdificios(edRes.data.data || [])
      setDistancias(distRes)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const getDistance = (origenId: string, destinoId: string): DistanciaEdificio | undefined => {
    return distancias.find(d => d.edificio_origen_id === origenId && d.edificio_destino_id === destinoId)
  }

  const handleMinutosChange = async (dist: DistanciaEdificio, value: string) => {
    const minutos = parseInt(value)
    if (isNaN(minutos) || minutos < 0) return

    try {
      await updateDistance(dist.id, { minutos })
      setDistancias(prev => prev.map(d => d.id === dist.id ? { ...d, minutos } : d))
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const msg = await generateDistances()
      toast.success(msg)
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al generar distancias')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="p-4 text-muted-foreground">Cargando...</div>

  if (edificios.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Se necesitan al menos 2 edificios para calcular distancias.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Distancias entre Edificios</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Tiempo de traslado en minutos. Las celdas en rojo indican distancias mayores a 15 minutos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Recargar
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            <Zap className="w-4 h-4 mr-2" /> {generating ? 'Generando...' : 'Auto-generar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-50 text-left min-w-[120px]">Desde / Hasta</th>
                {edificios.map(e => (
                  <th key={e.id} className="border p-2 bg-gray-50 text-center min-w-[80px]" title={e.name}>
                    {e.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {edificios.map(origen => (
                <tr key={origen.id}>
                  <td className="border p-2 bg-gray-50 font-medium" title={origen.name}>
                    {origen.code}
                  </td>
                  {edificios.map(destino => {
                    if (origen.id === destino.id) {
                      return <td key={destino.id} className="border p-2 bg-gray-100 text-center text-gray-300">-</td>
                    }

                    const dist = getDistance(origen.id, destino.id)

                    return (
                      <td key={destino.id} className={cn(
                        'border p-1',
                        dist && dist.minutos > 15 ? 'bg-red-50' : '',
                        dist && dist.minutos > 30 ? 'bg-red-100' : ''
                      )}>
                        {dist ? (
                          <Input
                            type="number"
                            min={0}
                            value={dist.minutos}
                            onChange={e => handleMinutosChange(dist, e.target.value)}
                            className={cn(
                              'w-16 h-8 text-center text-xs p-1',
                              dist.minutos > 15 ? 'text-red-700 font-bold' : ''
                            )}
                          />
                        ) : (
                          <span className="text-gray-300 text-xs block text-center">--</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-white border rounded" /> {'< 15 min'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-50 border rounded" /> 15-30 min
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-100 border rounded" /> {'> 30 min'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
