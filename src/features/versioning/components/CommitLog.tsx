import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { GitCommit, Cpu, PenLine, FileInput, GitMerge, RotateCcw, ArrowLeft, Tag, Diff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { getCommits, rollback } from '../services/versioningService'
import type { HorarioBranch, HorarioCommit } from '@/shared/types'

const tipoIcons: Record<string, React.ElementType> = {
  solver: Cpu,
  manual: PenLine,
  solicitud: FileInput,
  import: FileInput,
  merge: GitMerge,
  rollback: RotateCcw,
}

const tipoColors: Record<string, string> = {
  solver: 'bg-purple-100 text-purple-700',
  manual: 'bg-blue-100 text-blue-700',
  solicitud: 'bg-orange-100 text-orange-700',
  import: 'bg-cyan-100 text-cyan-700',
  merge: 'bg-green-100 text-green-700',
  rollback: 'bg-yellow-100 text-yellow-700',
}

interface Props {
  branch: HorarioBranch
  onBack: () => void
  onDiff: (commitA: string, commitB: string) => void
  onCreateTag: (commitId: string) => void
}

export function CommitLog({ branch, onBack, onDiff, onCreateTag }: Props) {
  const [commits, setCommits] = useState<HorarioCommit[]>([])
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCommits()
  }, [branch.id])

  const loadCommits = async () => {
    setLoading(true)
    try {
      const data = await getCommits(branch.id)
      setCommits(data)
    } catch {
      toast.error('Error al cargar commits')
    } finally {
      setLoading(false)
    }
  }

  const toggleDiffSelect = (commitId: string) => {
    setSelectedForDiff(prev => {
      if (prev.includes(commitId)) return prev.filter(id => id !== commitId)
      if (prev.length >= 2) return [prev[1], commitId]
      return [...prev, commitId]
    })
  }

  const handleDiff = () => {
    if (selectedForDiff.length === 2) {
      onDiff(selectedForDiff[0], selectedForDiff[1])
    }
  }

  const handleRollback = async (commitId: string) => {
    try {
      const result = await rollback({
        branch_id: branch.id,
        target_commit_id: commitId,
      })
      toast.success(`Rollback completado: ${result.total_asignaciones} asignaciones restauradas`)
      await loadCommits()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al hacer rollback'
      toast.error(msg)
    }
  }

  if (loading) return <div className="p-4 text-muted-foreground">Cargando commits...</div>

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-lg">
              {branch.nombre}
              <Badge variant="outline" className="ml-2 text-xs">{commits.length} commits</Badge>
            </CardTitle>
          </div>
          {selectedForDiff.length === 2 && (
            <Button size="sm" onClick={handleDiff}>
              <Diff className="w-4 h-4 mr-2" /> Comparar seleccionados
            </Button>
          )}
        </div>
        {selectedForDiff.length > 0 && selectedForDiff.length < 2 && (
          <p className="text-xs text-muted-foreground mt-1">Selecciona otro commit para comparar</p>
        )}
      </CardHeader>
      <CardContent>
        {commits.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Este branch no tiene commits</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {commits.map((commit, idx) => {
                const Icon = tipoIcons[commit.tipo] || GitCommit
                const isSelected = selectedForDiff.includes(commit.id)

                return (
                  <div
                    key={commit.id}
                    className={`relative flex items-start gap-3 pl-2 cursor-pointer rounded-lg p-2 transition-colors ${
                      isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleDiffSelect(commit.id)}
                  >
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      idx === 0 ? 'bg-blue-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{commit.mensaje}</span>
                        <Badge className={`text-xs ${tipoColors[commit.tipo] || ''}`}>
                          {commit.tipo}
                        </Badge>
                        {commit.score_global !== null && commit.score_global !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            Score: {commit.score_global}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{commit.autor_nombre}</span>
                        <span>{new Date(commit.created_at).toLocaleString('es-CL')}</span>
                        <span>{commit.total_asignaciones || 0} asignaciones</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => onCreateTag(commit.id)} title="Crear tag">
                        <Tag className="w-3 h-3" />
                      </Button>
                      {idx > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => handleRollback(commit.id)} title="Rollback a este punto">
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
