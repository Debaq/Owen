import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Clock, CheckCircle, XCircle, Zap, Eye } from 'lucide-react'
import type { SolicitudWithDetails } from '../services/solicitudService'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
  auto_aprobada: { label: 'Auto-aprobada', color: 'bg-blue-100 text-blue-800', icon: Zap },
}

interface SolicitudListProps {
  solicitudes: SolicitudWithDetails[]
  onViewDetail: (sol: SolicitudWithDetails) => void
  filterEstado: string
  onFilterChange: (estado: string) => void
  isLoading?: boolean
}

export function SolicitudList({
  solicitudes,
  onViewDetail,
  filterEstado,
  onFilterChange,
  isLoading = false,
}: SolicitudListProps) {
  const filtered = filterEstado === 'todas'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filterEstado)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} solicitudes</p>
        <Select value={filterEstado} onValueChange={onFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="aprobada">Aprobadas</SelectItem>
            <SelectItem value="rechazada">Rechazadas</SelectItem>
            <SelectItem value="auto_aprobada">Auto-aprobadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground italic">Cargando solicitudes...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay solicitudes {filterEstado !== 'todas' ? `con estado "${filterEstado}"` : ''}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(sol => {
          const config = STATUS_CONFIG[sol.estado] || STATUS_CONFIG.pendiente
          const Icon = config.icon
          return (
            <Card key={sol.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={config.color + ' text-xs'}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {sol.confianza_agente !== null && sol.confianza_agente !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          Score: {sol.confianza_agente}%
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium truncate">{sol.motivo}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      {sol.carrera_name && <span>Carrera: {sol.carrera_name}</span>}
                      {sol.usuario_name && <span>Solicitante: {sol.usuario_name}</span>}
                      <span>{sol.fecha_inicio} → {sol.fecha_fin}</span>
                      {sol.tipo_sala && <span>Tipo: {sol.tipo_sala}</span>}
                      {sol.capacidad_requerida && <span>Cap: {sol.capacidad_requerida}</span>}
                    </div>
                    {sol.sala_asignada_name && (
                      <p className="text-xs text-green-700 mt-1 font-medium">
                        Sala asignada: {sol.sala_asignada_name}
                      </p>
                    )}
                    {sol.respuesta_gestor && (
                      <p className="text-xs text-red-600 mt-1 italic">
                        Respuesta: {sol.respuesta_gestor}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(sol)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
