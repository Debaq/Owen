import { AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import type { ConflictoHorario } from '@/shared/types'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface ConflictsListProps {
  conflictos: ConflictoHorario[]
  loading?: boolean
}

export function ConflictsList({ conflictos, loading }: ConflictsListProps) {
  if (loading) {
    return <p className="text-sm text-gray-500 py-4 text-center">Cargando conflictos...</p>
  }

  if (conflictos.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
        <h3 className="text-lg font-semibold text-green-700">Sin conflictos</h3>
        <p className="text-sm text-gray-500 mt-1">
          Todas las asignaciones de sección son compatibles con los horarios.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">
          {conflictos.length} estudiante{conflictos.length !== 1 ? 's' : ''} con conflictos horarios.
          Mueva estudiantes entre secciones en la pestaña &quot;Secciones&quot; para resolverlos.
        </p>
      </div>

      {conflictos.map((c) => (
        <Card key={c.estudiante_id} className="border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm">{c.estudiante_nombre}</span>
              {c.estudiante_rut && (
                <span className="text-xs text-gray-500">({c.estudiante_rut})</span>
              )}
              <Badge variant="destructive" className="ml-auto text-xs">
                {c.conflictos.length} conflicto{c.conflictos.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="space-y-2 ml-6">
              {c.conflictos.map((conf, i) => (
                <div key={i} className="text-sm bg-amber-50 rounded p-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {conf.asignatura_a.code} (Sec. {conf.asignatura_a.seccion})
                    </Badge>
                    <span className="text-gray-400">choca con</span>
                    <Badge variant="outline" className="text-xs">
                      {conf.asignatura_b.code} (Sec. {conf.asignatura_b.seccion})
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {DIAS[conf.bloque.dia_semana] || `Día ${conf.bloque.dia_semana}`}
                    {conf.bloque.hora ? ` - ${conf.bloque.hora}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
