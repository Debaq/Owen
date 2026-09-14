import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { getAllBlocks, getSchedulesByRoom } from '@/features/schedules/services/scheduleService'
import type { HorarioWithDetails } from '@/features/schedules/services/scheduleService'
import type { Sala, BloqueHorario } from '@/shared/types'
import { Plus, BookOpen, User } from 'lucide-react'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

interface StepTimeSlotProps {
  room: Sala
  temporadaId: string
  sistemaId?: string
  refreshKey: number
  onCellClick: (day: number, block: BloqueHorario) => void
}

export function StepTimeSlot({
  room, temporadaId, sistemaId, refreshKey, onCellClick,
}: StepTimeSlotProps) {
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [schedules, setSchedules] = useState<HorarioWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAllBlocks(sistemaId),
      getSchedulesByRoom(room.id, temporadaId),
    ]).then(([b, s]) => {
      setBloques(b)
      setSchedules(s)
    }).finally(() => setLoading(false))
  }, [room.id, temporadaId, sistemaId, refreshKey])

  const rows = useMemo(() => {
    const grouped = new Map<number, {
      orden: number; nombre: string; hora_inicio: string; hora_fin: string
      byDay: Record<number, BloqueHorario>
    }>()
    bloques.forEach(b => {
      if (!grouped.has(b.orden)) {
        grouped.set(b.orden, { orden: b.orden, nombre: b.nombre, hora_inicio: b.hora_inicio, hora_fin: b.hora_fin, byDay: {} })
      }
      grouped.get(b.orden)!.byDay[b.dia_semana] = b
    })
    return Array.from(grouped.values()).sort((a, b) => a.orden - b.orden)
  }, [bloques])

  const getOccupied = (dia: number, bloqueId: string) => {
    return schedules.filter(s => s.dia_semana === dia && s.bloque_id === bloqueId)
  }

  // Contadores
  const totalCells = rows.length * 5
  const occupiedCount = schedules.length
  const freeCount = totalCells - occupiedCount

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Cargando grilla de {room.code}...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Grilla de {room.code} – {room.name}</h3>
          <p className="text-sm text-muted-foreground">
            Haz clic en una celda libre para programar un bloque.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary">{occupiedCount} asignados</Badge>
          <Badge variant="outline">{freeCount} libres</Badge>
        </div>
      </div>

      {/* Grilla */}
      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Header */}
          <div className="grid grid-cols-6 gap-1 mb-1">
            <div className="text-xs font-semibold text-muted-foreground p-2">Bloque</div>
            {[1, 2, 3, 4, 5].map(d => (
              <div key={d} className="text-center text-xs font-semibold bg-blue-600 text-white p-2 rounded-t">
                {DIAS[d]}
              </div>
            ))}
          </div>

          {/* Filas */}
          {rows.map(row => (
            <div key={row.orden} className="grid grid-cols-6 gap-1 mb-1">
              <div className="bg-gray-100 rounded p-2 flex flex-col justify-center">
                <span className="text-xs font-semibold leading-tight">{row.nombre}</span>
                <span className="text-[10px] text-muted-foreground">{row.hora_inicio}–{row.hora_fin}</span>
              </div>
              {[1, 2, 3, 4, 5].map(dia => {
                const bloque = row.byDay[dia]
                if (!bloque) return <div key={`${dia}-${row.orden}`} className="bg-gray-50 rounded min-h-[56px]" />

                const occupied = getOccupied(dia, bloque.id)
                const isFree = occupied.length === 0

                if (isFree) {
                  return (
                    <button
                      key={`${dia}-${bloque.id}`}
                      onClick={() => onCellClick(dia, bloque)}
                      className="rounded min-h-[56px] p-1 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-400 cursor-pointer transition-all group flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 text-green-400 group-hover:text-green-600 transition-colors" />
                    </button>
                  )
                }

                return (
                  <div
                    key={`${dia}-${bloque.id}`}
                    className="rounded min-h-[56px] p-1.5 bg-blue-50 border border-blue-200 space-y-0.5"
                  >
                    {occupied.map(h => (
                      <div key={h.id} className="space-y-0.5">
                        {h.asignatura ? (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <span className="text-[10px] font-semibold text-blue-800 truncate">{h.asignatura.code}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{h.tipo}</Badge>
                        )}
                        {h.docente && (
                          <div className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                            <span className="text-[9px] text-gray-600 truncate">{h.docente.name}</span>
                          </div>
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

      {/* Leyenda */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Libre</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Asignado</div>
      </div>
    </div>
  )
}
