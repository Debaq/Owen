import { useState } from 'react'
import { toast } from 'sonner'
import { GitMerge } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { mergeBranches } from '../services/versioningService'
import type { MergeConflict } from '../services/versioningService'
import type { HorarioBranch } from '@/shared/types'

interface Props {
  open: boolean
  onClose: () => void
  sourceBranch: HorarioBranch
  targetBranch: HorarioBranch
  onMerged: () => void
}

export function MergeDialog({ open, onClose, sourceBranch, targetBranch, onMerged }: Props) {
  const [strategy, setStrategy] = useState<'source_wins' | 'target_wins' | 'manual'>('source_wins')
  const [mensaje, setMensaje] = useState(`Merge: ${sourceBranch.nombre} → ${targetBranch.nombre}`)
  const [conflicts, setConflicts] = useState<MergeConflict[]>([])
  const [resoluciones, setResoluciones] = useState<Record<string, 'source' | 'target'>>({})
  const [loading, setLoading] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)

  const handleMerge = async () => {
    setLoading(true)
    try {
      const resolucionesArray = Object.entries(resoluciones).map(([sesion_id, elegir]) => ({
        sesion_id,
        elegir,
      }))

      const result = await mergeBranches({
        source_branch_id: sourceBranch.id,
        target_branch_id: targetBranch.id,
        mensaje,
        strategy,
        resoluciones: resolucionesArray.length > 0 ? resolucionesArray : undefined,
      })

      if (!result.success && result.conflicts) {
        setConflicts(result.conflicts)
        setShowConflicts(true)
        setStrategy('manual')
        toast.warning(`${result.conflicts_count} conflictos requieren resolución`)
      } else {
        toast.success(`Merge completado: ${result.data?.total_asignaciones} asignaciones`)
        onMerged()
        onClose()
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al realizar merge'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const allConflictsResolved = conflicts.length === 0 || Object.keys(resoluciones).length === conflicts.length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" /> Merge Branches
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{sourceBranch.nombre}</Badge>
            <span>→</span>
            <Badge>{targetBranch.nombre}</Badge>
          </div>

          <div>
            <Label>Mensaje del merge</Label>
            <Input value={mensaje} onChange={e => setMensaje(e.target.value)} />
          </div>

          {!showConflicts && (
            <div>
              <Label>Estrategia de resolución</Label>
              <Select value={strategy} onValueChange={(v: 'source_wins' | 'target_wins' | 'manual') => setStrategy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source_wins">Source gana (priorizar {sourceBranch.nombre})</SelectItem>
                  <SelectItem value="target_wins">Target gana (priorizar {targetBranch.nombre})</SelectItem>
                  <SelectItem value="manual">Manual (resolver conflictos uno a uno)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conflict resolution */}
          {showConflicts && conflicts.length > 0 && (
            <div>
              <Label className="mb-2 block">Conflictos ({conflicts.length})</Label>
              <div className="max-h-64 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sesión</TableHead>
                      <TableHead>{sourceBranch.nombre}</TableHead>
                      <TableHead>{targetBranch.nombre}</TableHead>
                      <TableHead>Elegir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map(c => (
                      <TableRow key={c.sesion_id}>
                        <TableCell className="font-mono text-xs">
                          {c.source.sesion_etiqueta || c.sesion_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.source.sala_code} / {c.source.bloque_nombre}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.target.sala_code} / {c.target.bloque_nombre}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={resoluciones[c.sesion_id] === 'source' ? 'default' : 'outline'}
                              onClick={() => setResoluciones(prev => ({ ...prev, [c.sesion_id]: 'source' }))}
                              className="text-xs h-7"
                            >
                              Source
                            </Button>
                            <Button
                              size="sm"
                              variant={resoluciones[c.sesion_id] === 'target' ? 'default' : 'outline'}
                              onClick={() => setResoluciones(prev => ({ ...prev, [c.sesion_id]: 'target' }))}
                              className="text-xs h-7"
                            >
                              Target
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleMerge}
              disabled={loading || (showConflicts && !allConflictsResolved)}
            >
              {loading ? 'Mergeando...' : showConflicts ? 'Aplicar resoluciones' : 'Merge'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
