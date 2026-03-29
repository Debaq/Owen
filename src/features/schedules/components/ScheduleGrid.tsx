import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import type { HorarioWithDetails } from '../services/scheduleService'
import { getAllBlocks, DIAS_SEMANA_SHORT } from '../services/scheduleService'
import type { BloqueHorario } from '@/shared/types'
import { Clock, User, MapPin, BookOpen, Plus } from 'lucide-react'

interface ScheduleGridProps {
  schedules: HorarioWithDetails[]
  onScheduleClick?: (schedule: HorarioWithDetails) => void
  onCellClick?: (dia: number, bloque: BloqueHorario) => void
}

export function ScheduleGrid({ schedules, onScheduleClick, onCellClick }: ScheduleGridProps) {
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBloques = async () => {
      setIsLoading(true)
      try {
        const data = await getAllBlocks()
        setBloques(data)
      } catch (error) {
        console.error('Error loading blocks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadBloques()
  }, [])

  // Group blocks by orden (time slot)
  const rows = useMemo(() => {
    const grouped = new Map();
    bloques.forEach(b => {
      if (!grouped.has(b.orden)) {
        grouped.set(b.orden, {
            id: b.id,
            orden: b.orden,
            nombre: b.nombre,
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
            byDay: {} as Record<number, BloqueHorario>
        });
      }
      grouped.get(b.orden).byDay[b.dia_semana] = b;
    });
    return Array.from(grouped.values()).sort((a, b) => a.orden - b.orden);
  }, [bloques]);

  // Organizar horarios por día y bloque
  const getSchedulesForCell = (dia: number, bloqueId: string): HorarioWithDetails[] => {
    return schedules.filter(
      s => s.dia_semana === dia && s.bloque_id === bloqueId
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cargando horarios...</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header con días de la semana */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="font-semibold text-sm text-muted-foreground p-2">
            Horario
          </div>
          {[1, 2, 3, 4, 5].map(dia => (
            <div key={dia} className="font-semibold text-center p-2 bg-primary text-primary-foreground rounded-t-lg">
              {DIAS_SEMANA_SHORT[dia]}
            </div>
          ))}
        </div>

        {/* Grid de horarios */}
        <div className="space-y-1">
          {rows.map(row => (
            <div key={row.orden} className="grid grid-cols-6 gap-2">
              {/* Columna de horario */}
              <div className="p-2 bg-muted rounded-lg flex flex-col justify-center">
                <div className="text-sm font-semibold">{row.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {row.hora_inicio} - {row.hora_fin}
                </div>
              </div>

              {/* Celdas para cada día */}
              {[1, 2, 3, 4, 5].map(dia => {
                const bloque = row.byDay[dia];
                
                if (!bloque) {
                    return <div key={`${dia}-empty-${row.orden}`} className="min-h-[100px] bg-gray-100/50 rounded-lg"></div>;
                }

                const horariosEnCelda = getSchedulesForCell(dia, bloque.id)

                return (
                  <div
                    key={`${dia}-${bloque.id}`}
                    onClick={() => {
                        if (horariosEnCelda.length === 0) {
                            onCellClick?.(dia, bloque);
                        }
                    }}
                    className={`min-h-[100px] p-2 rounded-lg border-2 transition-all relative group ${
                      horariosEnCelda.length > 0
                        ? 'bg-blue-50 border-blue-200 hover:border-blue-400'
                        : 'bg-white border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 cursor-pointer'
                    }`}
                  >
                    {horariosEnCelda.length > 0 ? (
                      <div className="space-y-1">
                        {horariosEnCelda.map(horario => (
                          <Card
                            key={horario.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={(e) => {
                                e.stopPropagation(); // Evitar disparar el click de la celda
                                onScheduleClick?.(horario);
                            }}
                          >
                            <CardContent className="p-3 space-y-1">
                              {/* Asignatura */}
                              {horario.asignatura && (
                                <div className="flex items-start gap-1">
                                  <BookOpen className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-sm leading-tight">
                                      {horario.asignatura.code}
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                      {horario.asignatura.name}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Docente */}
                              {horario.docente && (
                                <div className="flex items-center gap-1 text-xs">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span className="truncate">{horario.docente.name}</span>
                                </div>
                              )}

                              {/* Sala */}
                              {horario.sala && (
                                <div className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3 text-gray-500" />
                                  <span className="truncate">{horario.sala.code}</span>
                                </div>
                              )}

                              {/* Tipo de clase */}
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {horario.tipo}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 group-hover:text-primary/70 transition-colors">
                        <Plus className="h-8 w-8 mb-1" />
                        <span className="text-xs font-medium opacity-0 group-hover:opacity-100">Programar</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Leyenda:</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Asignatura</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span>Docente</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>Sala</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Click para ver detalles</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
