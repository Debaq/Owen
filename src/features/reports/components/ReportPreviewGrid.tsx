import { useMemo } from 'react'
import type { BloqueHorario } from '@/shared/types'
import type { HorarioWithDetails } from '@/features/schedules/services/scheduleService'
import { DIAS_SEMANA_SHORT } from '@/features/schedules/services/scheduleService'
import type { ReportType } from '../services/reportExportService'

interface ReportPreviewGridProps {
  schedules: HorarioWithDetails[]
  bloques: BloqueHorario[]
  reportType: ReportType
  isLoading: boolean
}

function formatCellPreview(reportType: ReportType, horarios: HorarioWithDetails[]): string[] {
  if (horarios.length === 0) return []

  return horarios.flatMap(h => {
    const lines: string[] = []
    if (reportType === 'room') {
      if (h.asignatura) lines.push(h.asignatura.code + ' - ' + h.asignatura.name)
      if (h.docente) lines.push(h.docente.name)
    } else if (reportType === 'teacher') {
      if (h.asignatura) lines.push(h.asignatura.code + ' - ' + h.asignatura.name)
      if (h.sala) lines.push('Sala: ' + h.sala.code)
    } else if (reportType === 'level') {
      if (h.asignatura) lines.push(h.asignatura.code)
      if (h.docente) lines.push(h.docente.name)
      if (h.sala) lines.push(h.sala.code)
    } else if (reportType === 'subject') {
      if (h.docente) lines.push(h.docente.name)
      if (h.sala) lines.push('Sala: ' + h.sala.code)
    }
    return lines.length > 0 ? lines : [h.tipo]
  })
}

export function ReportPreviewGrid({ schedules, bloques, reportType, isLoading }: ReportPreviewGridProps) {
  const rows = useMemo(() => {
    const grouped = new Map<number, {
      nombre: string
      hora_inicio: string
      hora_fin: string
      orden: number
      byDay: Record<number, BloqueHorario>
    }>()

    bloques.forEach(b => {
      if (!grouped.has(b.orden)) {
        grouped.set(b.orden, {
          nombre: b.nombre,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          orden: b.orden,
          byDay: {},
        })
      }
      grouped.get(b.orden)!.byDay[b.dia_semana] = b
    })

    return Array.from(grouped.values()).sort((a, b) => a.orden - b.orden)
  }, [bloques])

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando horarios...</div>
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {bloques.length === 0
          ? 'No hay bloques horarios configurados'
          : 'Seleccione un filtro para ver la vista previa'
        }
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-6 gap-1 mb-1">
          <div className="p-2 text-sm font-semibold text-muted-foreground">Horario</div>
          {[1, 2, 3, 4, 5].map(dia => (
            <div key={dia} className="p-2 text-center font-semibold text-sm bg-primary text-primary-foreground rounded-t">
              {DIAS_SEMANA_SHORT[dia]}
            </div>
          ))}
        </div>

        {/* Filas */}
        <div className="space-y-1">
          {rows.map(row => (
            <div key={row.orden} className="grid grid-cols-6 gap-1">
              <div className="p-2 bg-muted rounded text-sm">
                <div className="font-semibold">{row.nombre}</div>
                <div className="text-xs text-muted-foreground">{row.hora_inicio} - {row.hora_fin}</div>
              </div>

              {[1, 2, 3, 4, 5].map(dia => {
                const bloque = row.byDay[dia]
                if (!bloque) {
                  return <div key={dia} className="bg-gray-50 rounded min-h-[70px]" />
                }

                const horariosEnCelda = schedules.filter(
                  s => s.dia_semana === dia && s.bloque_id === bloque.id
                )
                const lines = formatCellPreview(reportType, horariosEnCelda)

                return (
                  <div
                    key={dia}
                    className={`p-2 rounded min-h-[70px] text-xs ${
                      lines.length > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-dashed border-gray-200'
                    }`}
                  >
                    {lines.map((line, i) => (
                      <div key={i} className={`${i === 0 ? 'font-semibold' : 'text-muted-foreground'} truncate`}>
                        {line}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
