import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Badge } from '@/shared/components/ui/badge'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { Asignatura, Horario } from '@/shared/types'

interface ScheduleProgressProps {
  asignaturas: Asignatura[]
  horarios: Horario[]
}

export function ScheduleProgress({ asignaturas, horarios }: ScheduleProgressProps) {
  const stats = useMemo(() => {
    return asignaturas.map(asig => {
      // Contar horas asignadas (cada bloque cuenta como 1 instancia, 
      // idealmente deberíamos sumar la duración real en minutos, 
      // pero por ahora asumiremos 1 bloque = horas pedagógicas según configuración)
      // Ojo: Si un bloque es de 2 horas pedagógicas, esto debería ajustarse.
      // Por simplicidad, contaremos "apariciones en el horario" vs "bloques semanales estimados"
      // Si horas_semanales es horas cronológicas o pedagógicas, la comparación directa puede variar.
      // Asumiremos que horas_semanales = cantidad de bloques necesarios.
      
      const asignadas = horarios.filter(h => h.asignatura_id === asig.id).length
      
      // Estimación simple: 1 bloque = 2 horas pedagógicas aprox? 
      // Mejor: Usamos horas_semanales directas si el usuario mapea 1 bloque = 1 hora,
      // O hacemos un cálculo relativo.
      // Para este prototipo: Meta = horas_semanales / 2 (asumiendo bloques dobles) o directo.
      // Vamos a asumir que "horas_semanales" en la BD son horas pedagógicas (ej: 4, 6)
      // y que cada bloque horario cuenta como 2 horas (estándar universitario 90 min).
      
      const bloquesNecesarios = Math.ceil(asig.horas_semanales / 2) 
      const progreso = Math.min(100, Math.round((asignadas / bloquesNecesarios) * 100))
      
      return {
        ...asig,
        asignadas,
        bloquesNecesarios,
        progreso,
        completado: asignadas >= bloquesNecesarios
      }
    }).sort((a, b) => a.progreso - b.progreso) // Los menos completos primero
  }, [asignaturas, horarios])

  const totalAsignaturas = stats.length
  const completadas = stats.filter(s => s.completado).length
  const progresoGeneral = totalAsignaturas > 0 ? Math.round((completadas / totalAsignaturas) * 100) : 0

  if (asignaturas.length === 0) return null

  return (
    <Card className="h-full border-l-4 border-l-primary/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Avance Curricular</span>
          <Badge variant={progresoGeneral === 100 ? 'default' : 'secondary'}>
            {progresoGeneral}% Listo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {stats.map(stat => (
          <div key={stat.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[180px]" title={stat.name}>
                {stat.code} - {stat.name}
              </span>
              <span className={`text-xs ${stat.completado ? 'text-green-600' : 'text-muted-foreground'}`}>
                {stat.asignadas}/{stat.bloquesNecesarios} bloq.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={stat.progreso} className="h-2" />
              {stat.completado ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-amber-500 opacity-50" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
