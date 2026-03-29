import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { CheckCircle, XCircle, Star, Building2 } from 'lucide-react'
import type { RoomMatchResult } from '@/shared/types'

const SCORE_LABELS: Record<string, string> = {
  disponibilidad: 'Disponibilidad',
  capacidad: 'Capacidad',
  tipo: 'Tipo Sala',
  mobiliario: 'Mobiliario',
  equipamiento: 'Equipamiento',
  preferida: 'Preferida',
}

const SCORE_MAX: Record<string, number> = {
  disponibilidad: 40,
  capacidad: 20,
  tipo: 15,
  mobiliario: 10,
  equipamiento: 10,
  preferida: 5,
}

interface MatchResultsProps {
  matches: RoomMatchResult[]
  confianza: number
  autoAprobable: boolean
  totalCandidates: number
  availableCount: number
  onSelectRoom?: (salaId: string) => void
  showSelectButton?: boolean
}

export function MatchResults({
  matches,
  confianza,
  autoAprobable,
  totalCandidates,
  availableCount,
  onSelectRoom,
  showSelectButton = false,
}: MatchResultsProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No se encontraron salas que coincidan</p>
        <p className="text-sm">Intente ajustar los criterios de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={autoAprobable ? 'default' : 'secondary'} className="text-sm py-1 px-3">
          Confianza: {confianza}%
        </Badge>
        <Badge variant="outline">
          {availableCount} de {totalCandidates} salas disponibles
        </Badge>
        {autoAprobable && (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Auto-aprobable
          </Badge>
        )}
        {!autoAprobable && matches.length > 0 && (
          <Badge variant="destructive">
            Requiere revisión del gestor
          </Badge>
        )}
      </div>

      {/* Lista de matches */}
      <div className="space-y-3">
        {matches.slice(0, 10).map((match, index) => (
          <Card
            key={match.sala.id}
            className={`${index === 0 ? 'border-blue-400 border-2' : ''} ${!match.available ? 'opacity-60' : ''}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {index === 0 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  <CardTitle className="text-base">
                    {match.sala.code} - {match.sala.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{match.score}pts</span>
                  {match.available ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-3 text-sm text-muted-foreground">
                <span>Cap: {match.sala.capacidad}</span>
                <span>|</span>
                <span>Tipo: {match.sala.tipo}</span>
                {match.sala.tipo_mobiliario && (
                  <>
                    <span>|</span>
                    <span>Mob: {match.sala.tipo_mobiliario.replace(/_/g, ' ')}</span>
                  </>
                )}
                {(match.sala as any).edificio_name && (
                  <>
                    <span>|</span>
                    <span>Edificio: {(match.sala as any).edificio_name}</span>
                  </>
                )}
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(match.breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{SCORE_LABELS[key] || key}</span>
                        <span>{value}/{SCORE_MAX[key] || '?'}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${value === (SCORE_MAX[key] || 0) ? 'bg-green-500' : value > 0 ? 'bg-blue-500' : 'bg-red-300'}`}
                          style={{ width: `${(value / (SCORE_MAX[key] || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conflictos */}
              {match.conflicts.length > 0 && (
                <div className="mt-2">
                  {match.conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-red-500">{c}</p>
                  ))}
                </div>
              )}

              {showSelectButton && match.available && onSelectRoom && (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => onSelectRoom(match.sala.id)}>
                    Asignar esta sala
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
