import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Shuffle, RotateCcw, Users, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { SortingStatus } from '@/shared/types'
import { autoSort, resetSort } from '../services/studentGroupService'

interface SortingControlsProps {
  status: SortingStatus | null
  carreraId: string
  temporadaId: string
  nivelId?: string
  onSorted: () => void
}

export function SortingControls({ status, carreraId, temporadaId, nivelId, onSorted }: SortingControlsProps) {
  const [sorting, setSorting] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleAutoSort = async () => {
    setSorting(true)
    try {
      const result = await autoSort({ carrera_id: carreraId, temporada_id: temporadaId, nivel_id: nivelId })
      const msg = `${result.asignaciones_creadas} asignaciones creadas`
      if (result.conflictos_residuales.length > 0) {
        toast.warning(`${msg}. ${result.conflictos_residuales.length} conflictos pendientes`)
      } else {
        toast.success(`${msg}. Sin conflictos`)
      }
      onSorted()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en auto-sorting'
      toast.error(msg)
    } finally {
      setSorting(false)
    }
  }

  const handleReset = async (preserveManual: boolean) => {
    setResetting(true)
    try {
      const result = await resetSort({
        carrera_id: carreraId,
        temporada_id: temporadaId,
        preserve_manual: preserveManual,
      })
      toast.success(`${result.deleted} asignaciones eliminadas`)
      onSorted()
    } catch {
      toast.error('Error al resetear')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{status.total_estudiantes}</p>
                <p className="text-xs text-gray-500">Estudiantes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-500" />
              <div>
                <p className="text-2xl font-bold">{status.total_inscritos}</p>
                <p className="text-xs text-gray-500">Inscritos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{status.total_asignados}</p>
                <p className="text-xs text-gray-500">Asignados a sección</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Shuffle className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {status.asignaturas_sorteadas}/{status.asignaturas_con_secciones}
                </p>
                <p className="text-xs text-gray-500">Asignaturas sorteadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              {status.total_conflictos > 0 ? (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-500" />
              )}
              <div>
                <p className="text-2xl font-bold">{status.total_conflictos}</p>
                <p className="text-xs text-gray-500">Conflictos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleAutoSort} disabled={sorting || resetting}>
          <Shuffle className="w-4 h-4 mr-2" />
          {sorting ? 'Sorteando...' : nivelId ? 'Auto-Sort Nivel' : 'Auto-Sort Carrera'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleReset(true)}
          disabled={sorting || resetting}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {resetting ? 'Reseteando...' : 'Reset (preservar manuales)'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleReset(false)}
          disabled={sorting || resetting}
          className="text-red-600 hover:text-red-700"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset total
        </Button>
      </div>
    </div>
  )
}
