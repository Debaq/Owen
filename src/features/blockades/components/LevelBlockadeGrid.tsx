import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { getLevelBlockades, createLevelBlockade, deleteLevelBlockade } from '../services/blockadeService'
import type { BloqueoNivel, BloqueHorario, Carrera } from '@/shared/types'
import { api } from '@/shared/lib/api'
import type { ApiResponse, Nivel } from '@/shared/types'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface Props {
  temporadaId: string
}

export function LevelBlockadeGrid({ temporadaId }: Props) {
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [blockades, setBlockades] = useState<BloqueoNivel[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState<string>('')
  const [selectedNivel, setSelectedNivel] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCarreras()
    loadBloques()
  }, [])

  useEffect(() => {
    if (selectedCarrera) {
      loadNiveles(selectedCarrera)
    } else {
      setNiveles([])
      setSelectedNivel('')
    }
  }, [selectedCarrera])

  useEffect(() => {
    if (selectedNivel && temporadaId) {
      loadBlockades()
    } else {
      setBlockades([])
    }
  }, [selectedNivel, temporadaId])

  const loadCarreras = async () => {
    try {
      const response = await api.get<ApiResponse<Carrera[]>>('/carreras.php')
      setCarreras(response.data.data || [])
    } catch { /* ignore */ }
  }

  const loadNiveles = async (carreraId: string) => {
    try {
      const response = await api.get<ApiResponse<Nivel[]>>(`/niveles.php?carrera_id=${carreraId}`)
      setNiveles(response.data.data || [])
      setSelectedNivel('')
    } catch { /* ignore */ }
  }

  const loadBloques = async () => {
    try {
      const response = await api.get<ApiResponse<BloqueHorario[]>>('/bloques.php')
      setBloques((response.data.data || []).filter((b: BloqueHorario) => b.activo))
    } catch { /* ignore */ }
  }

  const loadBlockades = useCallback(async () => {
    try {
      const data = await getLevelBlockades(selectedNivel, temporadaId)
      setBlockades(data)
    } catch { /* ignore */ }
  }, [selectedNivel, temporadaId])

  const isBlocked = (dia: number, bloqueId: string): BloqueoNivel | undefined => {
    return blockades.find(b =>
      (b.dia_semana === dia || b.dia_semana === null) &&
      (b.bloque_id === bloqueId || b.bloque_id === null)
    )
  }

  const toggleBlock = async (dia: number, bloqueId: string) => {
    if (!selectedNivel || !temporadaId) return
    setLoading(true)

    const existing = isBlocked(dia, bloqueId)

    try {
      if (existing) {
        await deleteLevelBlockade(existing.id)
        toast.success('Bloqueo eliminado')
      } else {
        await createLevelBlockade({
          nivel_id: selectedNivel,
          temporada_id: temporadaId,
          dia_semana: dia,
          bloque_id: bloqueId,
        })
        toast.success('Bloqueo creado')
      }
      await loadBlockades()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al modificar bloqueo')
    } finally {
      setLoading(false)
    }
  }

  // Obtener días únicos de los bloques
  const dias = [...new Set(bloques.map(b => b.dia_semana))].sort()
  // Agrupar bloques por orden (filas)
  const bloquesUnicos = bloques
    .filter(b => b.dia_semana === dias[0])
    .sort((a, b) => a.orden - b.orden)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bloqueos por Nivel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Haz clic en una celda para bloquear/desbloquear un bloque horario para el nivel seleccionado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Carrera</label>
            <Select value={selectedCarrera} onValueChange={setSelectedCarrera}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar carrera" />
              </SelectTrigger>
              <SelectContent>
                {carreras.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Nivel</label>
            <Select value={selectedNivel} onValueChange={setSelectedNivel} disabled={!selectedCarrera}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nivel" />
              </SelectTrigger>
              <SelectContent>
                {niveles.map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedNivel && bloquesUnicos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-50 text-sm font-medium text-left w-24">Bloque</th>
                  {dias.map(dia => (
                    <th key={dia} className="border p-2 bg-gray-50 text-sm font-medium text-center">
                      {DIAS[dia] || `Día ${dia}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bloquesUnicos.map(bloque => (
                  <tr key={bloque.id}>
                    <td className="border p-2 text-xs font-medium bg-gray-50">
                      <div>{bloque.nombre}</div>
                      <div className="text-gray-400">{bloque.hora_inicio}-{bloque.hora_fin}</div>
                    </td>
                    {dias.map(dia => {
                      const bloqueDelDia = bloques.find(b => b.dia_semana === dia && b.orden === bloque.orden)
                      if (!bloqueDelDia) return <td key={dia} className="border p-2" />

                      const blocked = isBlocked(dia, bloqueDelDia.id)
                      return (
                        <td key={dia} className="border p-0">
                          <Button
                            variant="ghost"
                            className={cn(
                              'w-full h-10 rounded-none text-xs',
                              blocked
                                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                : 'hover:bg-gray-100'
                            )}
                            onClick={() => toggleBlock(dia, bloqueDelDia.id)}
                            disabled={loading}
                          >
                            {blocked ? 'Bloqueado' : ''}
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedNivel && blockades.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {blockades.length} bloqueo{blockades.length !== 1 ? 's' : ''} activo{blockades.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
