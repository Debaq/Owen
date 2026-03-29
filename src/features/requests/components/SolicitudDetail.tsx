import { useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { CheckCircle, XCircle, Clock, Zap, Loader2 } from 'lucide-react'
import { MatchResults } from './MatchResults'
import type { SolicitudWithDetails, MatchResponse } from '../services/solicitudService'
import { matchRooms, approveSolicitud, rejectSolicitud } from '../services/solicitudService'
import { toast } from 'sonner'

const DIAS_SEMANA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  aprobada: { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
  auto_aprobada: { label: 'Auto-aprobada', color: 'bg-blue-100 text-blue-800', icon: Zap },
}

interface SolicitudDetailProps {
  solicitud: SolicitudWithDetails
  isGestor: boolean
  onUpdated: () => void
}

export function SolicitudDetail({ solicitud, isGestor, onUpdated }: SolicitudDetailProps) {
  const [matchResults, setMatchResults] = useState<MatchResponse | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const config = STATUS_CONFIG[solicitud.estado] || STATUS_CONFIG.pendiente
  const Icon = config.icon

  const handleRunMatch = async () => {
    setIsMatching(true)
    try {
      const results = await matchRooms({
        motivo: solicitud.motivo,
        tipo_sala: solicitud.tipo_sala || undefined,
        mobiliario_requerido: solicitud.mobiliario_requerido,
        capacidad_requerida: solicitud.capacidad_requerida || undefined,
        equipamiento_requerido: solicitud.equipamiento_requerido,
        fecha_inicio: solicitud.fecha_inicio,
        fecha_fin: solicitud.fecha_fin,
        bloques: solicitud.bloques,
        sala_preferida_id: solicitud.sala_preferida_id || undefined,
        recurrente: solicitud.recurrente,
      })
      setMatchResults(results)
    } catch (err) {
      toast.error('Error al ejecutar el algoritmo')
    } finally {
      setIsMatching(false)
    }
  }

  const handleApprove = async (salaId: string) => {
    setIsApproving(true)
    try {
      await approveSolicitud(solicitud.id, salaId)
      toast.success('Solicitud aprobada')
      onUpdated()
    } catch (err) {
      toast.error('Error al aprobar la solicitud')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await rejectSolicitud(solicitud.id, rejectReason)
      toast.success('Solicitud rechazada')
      onUpdated()
    } catch (err) {
      toast.error('Error al rechazar la solicitud')
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Estado */}
      <div className="flex items-center gap-2">
        <Badge className={config.color}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        {solicitud.confianza_agente !== null && solicitud.confianza_agente !== undefined && (
          <Badge variant="outline">Score: {solicitud.confianza_agente}%</Badge>
        )}
      </div>

      {/* Info principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <Label className="text-muted-foreground text-xs">Motivo</Label>
          <p>{solicitud.motivo}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Solicitante</Label>
          <p>{solicitud.usuario_name || solicitud.solicitante}</p>
        </div>
        {solicitud.carrera_name && (
          <div>
            <Label className="text-muted-foreground text-xs">Carrera</Label>
            <p>{solicitud.carrera_name}</p>
          </div>
        )}
        <div>
          <Label className="text-muted-foreground text-xs">Fechas</Label>
          <p>{solicitud.fecha_inicio} → {solicitud.fecha_fin}</p>
        </div>
        {solicitud.tipo_sala && (
          <div>
            <Label className="text-muted-foreground text-xs">Tipo de Sala</Label>
            <p className="capitalize">{solicitud.tipo_sala}</p>
          </div>
        )}
        {solicitud.capacidad_requerida && (
          <div>
            <Label className="text-muted-foreground text-xs">Capacidad Requerida</Label>
            <p>{solicitud.capacidad_requerida} personas</p>
          </div>
        )}
        {solicitud.mobiliario_requerido && (
          <div>
            <Label className="text-muted-foreground text-xs">Mobiliario</Label>
            <p className="capitalize">{solicitud.mobiliario_requerido.replace(/_/g, ' ')}</p>
          </div>
        )}
        {solicitud.recurrente && (
          <div>
            <Label className="text-muted-foreground text-xs">Recurrencia</Label>
            <p>Semanal</p>
          </div>
        )}
      </div>

      {/* Equipamiento */}
      {solicitud.equipamiento_requerido.length > 0 && (
        <div>
          <Label className="text-muted-foreground text-xs">Equipamiento Requerido</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {solicitud.equipamiento_requerido.map((e, i) => (
              <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Bloques */}
      {solicitud.bloques_detail && solicitud.bloques_detail.length > 0 && (
        <div>
          <Label className="text-muted-foreground text-xs">Bloques Solicitados</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {solicitud.bloques_detail.map(b => (
              <Badge key={b.id} variant="secondary" className="text-xs">
                {DIAS_SEMANA[b.dia_semana] || `Día ${b.dia_semana}`} {b.hora_inicio}-{b.hora_fin}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sala preferida / asignada */}
      {solicitud.sala_preferida_name && (
        <div>
          <Label className="text-muted-foreground text-xs">Sala Preferida</Label>
          <p className="text-sm">{solicitud.sala_preferida_name}</p>
        </div>
      )}
      {solicitud.sala_asignada_name && (
        <div>
          <Label className="text-muted-foreground text-xs">Sala Asignada</Label>
          <p className="text-sm font-medium text-green-700">{solicitud.sala_asignada_name}</p>
        </div>
      )}

      {/* Respuesta gestor */}
      {solicitud.respuesta_gestor && (
        <div>
          <Label className="text-muted-foreground text-xs">Respuesta del Gestor</Label>
          <p className="text-sm italic text-red-600">{solicitud.respuesta_gestor}</p>
        </div>
      )}

      {/* Acciones Gestor */}
      {isGestor && solicitud.estado === 'pendiente' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleRunMatch} disabled={isMatching} variant="outline">
                {isMatching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando...</>
                ) : (
                  'Ejecutar Algoritmo'
                )}
              </Button>
            </div>

            {/* Resultados del match */}
            {matchResults && (
              <MatchResults
                matches={matchResults.matches}
                confianza={matchResults.confianza}
                autoAprobable={matchResults.auto_aprobable}
                totalCandidates={matchResults.total_candidates}
                availableCount={matchResults.available_count}
                onSelectRoom={handleApprove}
                showSelectButton={!isApproving}
              />
            )}

            <Separator />

            {/* Rechazar */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rechazar solicitud</Label>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm"
                placeholder="Motivo del rechazo (opcional)..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
                {isRejecting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rechazando...</>
                ) : (
                  'Rechazar Solicitud'
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
