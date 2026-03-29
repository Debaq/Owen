import { Link } from 'react-router-dom'
import { Card } from '@/shared/components/ui/card'
import { Users, Projector, AlertTriangle } from 'lucide-react'

interface HorarioInfo {
  id: string
  tipo: string
  asignatura_code?: string
  asignatura_name?: string
  docente_name?: string
}

interface AyudaInfo {
  id: string
  mensaje: string
  autor_email: string
  created_at: string
}

export interface SalaEdificio {
  id: string
  code: string
  name: string
  piso: number
  tipo: string
  capacidad: number
  equipamiento: string[]
  horario_actual: HorarioInfo | null
  horario_siguiente: HorarioInfo | null
  ayuda_activa: AyudaInfo[]
}

interface BuildingRoomCardProps {
  sala: SalaEdificio
  variant: 'actual' | 'siguiente'
}

const TIPO_COLORS: Record<string, string> = {
  clase: 'bg-blue-100 text-blue-800 border-blue-200',
  evento: 'bg-purple-100 text-purple-800 border-purple-200',
  examen: 'bg-orange-100 text-orange-800 border-orange-200',
  taller: 'bg-green-100 text-green-800 border-green-200',
}

export function BuildingRoomCard({ sala, variant }: BuildingRoomCardProps) {
  const horario = variant === 'actual' ? sala.horario_actual : sala.horario_siguiente
  const hasHelp = sala.ayuda_activa.length > 0
  const isOccupied = horario !== null

  const hasProjector = sala.equipamiento.some(e =>
    e.toLowerCase().includes('proyector') || e.toLowerCase().includes('data')
  )

  return (
    <Link to={`/public/room/${sala.id}`}>
      <Card className={`p-3 transition-all hover:shadow-md relative ${
        hasHelp ? 'ring-2 ring-red-400' : ''
      } ${isOccupied ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-400'}`}>

        {/* Badge ayuda pulsante */}
        {hasHelp && (
          <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            <AlertTriangle className="h-3 w-3" /> AYUDA
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{sala.code}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{sala.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasProjector && <Projector className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Users className="h-3 w-3" />{sala.capacidad}
            </span>
          </div>
        </div>

        {/* Estado */}
        {isOccupied ? (
          <div className={`rounded p-2 text-xs ${TIPO_COLORS[horario.tipo] || 'bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase">{horario.tipo}</span>
              {horario.asignatura_code && (
                <span className="font-mono font-bold">{horario.asignatura_code}</span>
              )}
            </div>
            {horario.asignatura_name && (
              <p className="truncate mt-0.5">{horario.asignatura_name}</p>
            )}
            {horario.docente_name && (
              <p className="text-[11px] opacity-80 mt-0.5">{horario.docente_name}</p>
            )}
          </div>
        ) : (
          <div className="rounded p-2 text-xs bg-green-50 text-green-700 border border-green-200 font-medium text-center">
            LIBRE
          </div>
        )}
      </Card>
    </Link>
  )
}
