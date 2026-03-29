import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { getAllBlocks, getSchedulesByRoom } from '@/features/schedules/services/scheduleService'
import type { HorarioWithDetails } from '@/features/schedules/services/scheduleService'
import type { Sala, BloqueHorario, RecurrenceType } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { Check } from 'lucide-react'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

interface StepTimeSlotProps {
  room: Sala
  temporadaId: string
  selectedDay: number | null
  selectedBlock: BloqueHorario | null
  recurrencia: RecurrenceType
  fechaInicio: string
  fechaFin: string
  onSelectCell: (day: number, block: BloqueHorario) => void
  onRecurrenciaChange: (v: RecurrenceType) => void
  onFechaInicioChange: (v: string) => void
  onFechaFinChange: (v: string) => void
}

export function StepTimeSlot({
  room, temporadaId, selectedDay, selectedBlock,
  recurrencia, fechaInicio, fechaFin,
  onSelectCell, onRecurrenciaChange, onFechaInicioChange, onFechaFinChange,
}: StepTimeSlotProps) {
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [schedules, setSchedules] = useState<HorarioWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAllBlocks(),
      getSchedulesByRoom(room.id, temporadaId),
    ]).then(([b, s]) => {
      setBloques(b)
      setSchedules(s)
    }).finally(() => setLoading(false))
  }, [room.id, temporadaId])

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

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Cargando grilla de {room.code}...</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Selecciona dia y bloque</h3>
        <p className="text-sm text-muted-foreground">
          Sala: <strong>{room.code} - {room.name}</strong>. Haz clic en una celda libre.
        </p>
      </div>

      {/* Grilla compacta */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid grid-cols-6 gap-1 mb-1">
            <div className="text-xs font-semibold text-muted-foreground p-1.5">Bloque</div>
            {[1, 2, 3, 4, 5].map(d => (
              <div key={d} className="text-center text-xs font-semibold bg-blue-600 text-white p-1.5 rounded-t">
                {DIAS[d]}
              </div>
            ))}
          </div>

          {/* Filas */}
          {rows.map(row => (
            <div key={row.orden} className="grid grid-cols-6 gap-1 mb-1">
              <div className="bg-gray-100 rounded p-1.5 flex flex-col justify-center">
                <span className="text-xs font-semibold leading-tight">{row.nombre}</span>
                <span className="text-[10px] text-muted-foreground">{row.hora_inicio}-{row.hora_fin}</span>
              </div>
              {[1, 2, 3, 4, 5].map(dia => {
                const bloque = row.byDay[dia]
                if (!bloque) return <div key={`${dia}-${row.orden}`} className="bg-gray-50 rounded min-h-[44px]" />

                const occupied = getOccupied(dia, bloque.id)
                const isSelected = selectedDay === dia && selectedBlock?.id === bloque.id
                const isFree = occupied.length === 0

                return (
                  <button
                    key={`${dia}-${bloque.id}`}
                    disabled={!isFree}
                    onClick={() => isFree && onSelectCell(dia, bloque)}
                    className={cn(
                      'rounded min-h-[44px] p-1 text-center transition-all relative',
                      isFree && !isSelected && 'bg-green-50 border border-green-200 hover:bg-green-100 cursor-pointer',
                      isFree && isSelected && 'bg-blue-100 border-2 border-blue-500 ring-1 ring-blue-500',
                      !isFree && 'bg-red-50 border border-red-200 cursor-not-allowed opacity-70',
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-blue-600 mx-auto" />}
                    {!isFree && occupied.map(h => (
                      <div key={h.id} className="text-[9px] text-red-700 leading-tight">
                        {h.asignatura?.code || h.tipo}
                      </div>
                    ))}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Libre</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Ocupado</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border-2 border-blue-500" /> Seleccionado</div>
      </div>

      {/* Recurrencia y fechas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
        <div className="space-y-1">
          <Label className="text-sm">Recurrencia</Label>
          <Select value={recurrencia} onValueChange={v => onRecurrenciaChange(v as RecurrenceType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="unica">Unica vez</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Fecha inicio</Label>
          <Input type="date" value={fechaInicio} onChange={e => onFechaInicioChange(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Fecha fin</Label>
          <Input type="date" value={fechaFin} onChange={e => onFechaFinChange(e.target.value)} />
        </div>
      </div>
    </div>
  )
}
