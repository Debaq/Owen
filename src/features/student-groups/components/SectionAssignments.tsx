import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowRightLeft, Lock } from 'lucide-react'
import { toast } from 'sonner'
import type { Asignatura, Seccion, AsignacionSeccion } from '@/shared/types'
import { getSortingPreview, moveEstudiante } from '../services/studentGroupService'

interface SectionAssignmentsProps {
  asignaturas: Asignatura[]
  secciones: Seccion[]
  temporadaId: string
  onChanged: () => void
}

export function SectionAssignments({ asignaturas, secciones, temporadaId, onChanged }: SectionAssignmentsProps) {
  const [selectedAsig, setSelectedAsig] = useState<string>('')
  const [preview, setPreview] = useState<AsignacionSeccion[]>([])
  const [loading, setLoading] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedAsig && temporadaId) {
      loadPreview()
    } else {
      setPreview([])
    }
  }, [selectedAsig, temporadaId])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const data = await getSortingPreview({
        asignatura_id: selectedAsig,
        temporada_id: temporadaId,
      })
      setPreview(data)
    } catch {
      toast.error('Error al cargar asignaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleMove = async (estudianteId: string, asignaturaId: string, nuevaSeccionId: string) => {
    setMovingId(estudianteId)
    try {
      await moveEstudiante({
        estudiante_id: estudianteId,
        asignatura_id: asignaturaId,
        temporada_id: temporadaId,
        nueva_seccion_id: nuevaSeccionId,
      })
      toast.success('Estudiante movido')
      loadPreview()
      onChanged()
    } catch {
      toast.error('Error al mover estudiante')
    } finally {
      setMovingId(null)
    }
  }

  // Agrupar asignaciones por sección
  const porSeccion: Record<string, AsignacionSeccion[]> = {}
  for (const p of preview) {
    const key = p.seccion_id
    if (!porSeccion[key]) porSeccion[key] = []
    porSeccion[key].push(p)
  }

  // Asignaturas con secciones (filtrar las que tienen secciones en su nivel)
  const asigConSecciones = asignaturas.filter(a =>
    secciones.some(s => s.nivel_id === a.nivel_id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Asignatura:</label>
        <Select value={selectedAsig} onValueChange={setSelectedAsig}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Seleccionar asignatura..." />
          </SelectTrigger>
          <SelectContent>
            {asigConSecciones.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.code} - {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}

      {!loading && selectedAsig && preview.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          Sin asignaciones. Ejecute el Auto-Sort primero.
        </p>
      )}

      {!loading && Object.keys(porSeccion).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secciones
            .filter(s => asigConSecciones.find(a => a.id === selectedAsig && a.nivel_id === s.nivel_id))
            .map(sec => {
              const estudiantes = porSeccion[sec.id] || []
              return (
                <Card key={sec.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Sección {sec.nombre}</span>
                      <Badge variant="secondary">{estudiantes.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {estudiantes.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Vacía</p>
                    ) : (
                      <ul className="space-y-1">
                        {estudiantes.map(est => (
                          <li key={est.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {est.manual && (
                                <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{est.estudiante_nombre}</span>
                            </div>
                            <Select
                              value={sec.id}
                              onValueChange={(newSecId) => {
                                if (newSecId !== sec.id) {
                                  handleMove(est.estudiante_id, selectedAsig, newSecId)
                                }
                              }}
                              disabled={movingId === est.estudiante_id}
                            >
                              <SelectTrigger className="w-20 h-7 text-xs">
                                <ArrowRightLeft className="w-3 h-3" />
                              </SelectTrigger>
                              <SelectContent>
                                {secciones
                                  .filter(s => s.nivel_id === sec.nivel_id)
                                  .map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      Sección {s.nombre}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
