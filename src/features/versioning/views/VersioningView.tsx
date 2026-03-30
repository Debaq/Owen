import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, GitBranch, Tag } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { BranchCard } from '../components/BranchCard'
import { CommitLog } from '../components/CommitLog'
import { DiffView } from '../components/DiffView'
import { MergeDialog } from '../components/MergeDialog'
import { getBranches, createBranch, deleteBranch, getTags, createTag, deleteTag } from '../services/versioningService'
import type { HorarioBranch, HorarioTag } from '@/shared/types'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

interface Temporada { id: string; nombre: string; activa: boolean }

type ViewMode = 'branches' | 'commits' | 'diff'

export function VersioningView() {
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [selectedTemporada, setSelectedTemporada] = useState('')
  const [branches, setBranches] = useState<HorarioBranch[]>([])
  const [tags, setTags] = useState<HorarioTag[]>([])

  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('branches')
  const [selectedBranch, setSelectedBranch] = useState<HorarioBranch | null>(null)
  const [diffCommits, setDiffCommits] = useState<{ a: string; b: string } | null>(null)

  // Dialogs
  const [createBranchOpen, setCreateBranchOpen] = useState(false)
  const [createBranchData, setCreateBranchData] = useState({ nombre: '', descripcion: '' })
  const [forkSource, setForkSource] = useState<HorarioBranch | null>(null)
  const [mergeSource, setMergeSource] = useState<HorarioBranch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HorarioBranch | null>(null)
  const [createTagOpen, setCreateTagOpen] = useState(false)
  const [tagCommitId, setTagCommitId] = useState('')
  const [tagName, setTagName] = useState('')

  useEffect(() => {
    api.get<ApiResponse<Temporada[]>>('/temporadas.php').then(res => {
      const temps = res.data.data || []
      setTemporadas(temps)
      const activa = temps.find((t: Temporada) => t.activa)
      if (activa) setSelectedTemporada(activa.id)
    })
  }, [])

  useEffect(() => {
    if (selectedTemporada) {
      loadData()
      setViewMode('branches')
      setSelectedBranch(null)
    }
  }, [selectedTemporada])

  const loadData = async () => {
    if (!selectedTemporada) return
    const [b, t] = await Promise.all([
      getBranches(selectedTemporada),
      getTags(selectedTemporada),
    ])
    setBranches(b)
    setTags(t)
  }

  // Branch actions
  const handleViewBranch = (branch: HorarioBranch) => {
    setSelectedBranch(branch)
    setViewMode('commits')
  }

  const handleFork = (branch: HorarioBranch) => {
    setForkSource(branch)
    setCreateBranchData({ nombre: `${branch.nombre} (copia)`, descripcion: `Fork de ${branch.nombre}` })
    setCreateBranchOpen(true)
  }

  const handleCreateBranch = async () => {
    if (!createBranchData.nombre) { toast.error('Nombre requerido'); return }
    try {
      await createBranch({
        temporada_id: selectedTemporada,
        nombre: createBranchData.nombre,
        descripcion: createBranchData.descripcion,
        branch_padre_id: forkSource?.id,
        commit_padre_id: forkSource?.ultimo_commit_id,
      })
      toast.success('Branch creado')
      setCreateBranchOpen(false)
      setCreateBranchData({ nombre: '', descripcion: '' })
      setForkSource(null)
      await loadData()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error'
      toast.error(msg)
    }
  }

  const handleDeleteBranch = async () => {
    if (!deleteTarget) return
    try {
      await deleteBranch(deleteTarget.id)
      toast.success('Branch eliminado')
      setDeleteTarget(null)
      await loadData()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error'
      toast.error(msg)
    }
  }

  // Tag actions
  const handleCreateTag = async () => {
    if (!tagName || !tagCommitId) { toast.error('Nombre requerido'); return }
    try {
      await createTag({ commit_id: tagCommitId, nombre: tagName })
      toast.success('Tag creado')
      setCreateTagOpen(false)
      setTagName('')
      setTagCommitId('')
      await loadData()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error'
      toast.error(msg)
    }
  }

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id)
      toast.success('Tag eliminado')
      await loadData()
    } catch { /* ignore */ }
  }

  const principalBranch = branches.find(b => b.es_principal)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6" /> Versionado de Horarios
          </h1>
          <p className="text-muted-foreground">
            Gestiona propuestas, compara alternativas y publica horarios oficiales.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTemporada} onValueChange={setSelectedTemporada}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              {temporadas.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nombre} {t.activa ? '(activa)' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {viewMode === 'branches' && (
            <Button onClick={() => { setForkSource(null); setCreateBranchData({ nombre: '', descripcion: '' }); setCreateBranchOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Branch
            </Button>
          )}
        </div>
      </div>

      {/* Main content based on viewMode */}
      {viewMode === 'branches' && selectedTemporada && (
        <Tabs defaultValue="branches">
          <TabsList>
            <TabsTrigger value="branches">Branches ({branches.length})</TabsTrigger>
            <TabsTrigger value="tags">Tags ({tags.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="branches" className="mt-4 space-y-3">
            {branches.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No hay branches para esta temporada. Crea uno o ejecuta el solver.
              </p>
            ) : (
              branches.map(branch => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  onView={handleViewBranch}
                  onFork={handleFork}
                  onMerge={(b) => setMergeSource(b)}
                  onDelete={(b) => setDeleteTarget(b)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            {tags.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No hay tags publicados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map(tag => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Tag className="w-4 h-4 text-yellow-500" /> {tag.nombre}
                      </TableCell>
                      <TableCell>{tag.branch_nombre}</TableCell>
                      <TableCell>
                        {tag.score_global !== null && tag.score_global !== undefined ? (
                          <Badge variant="outline">{tag.score_global}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{tag.autor_nombre}</TableCell>
                      <TableCell>{new Date(tag.created_at).toLocaleDateString('es-CL')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTag(tag.id)} className="text-red-500">
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      )}

      {viewMode === 'commits' && selectedBranch && (
        <CommitLog
          branch={selectedBranch}
          onBack={() => setViewMode('branches')}
          onDiff={(a, b) => { setDiffCommits({ a, b }); setViewMode('diff') }}
          onCreateTag={(commitId) => { setTagCommitId(commitId); setTagName(''); setCreateTagOpen(true) }}
        />
      )}

      {viewMode === 'diff' && diffCommits && (
        <DiffView
          commitA={diffCommits.a}
          commitB={diffCommits.b}
          onBack={() => setViewMode('commits')}
        />
      )}

      {/* Create Branch Dialog */}
      <Dialog open={createBranchOpen} onOpenChange={setCreateBranchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{forkSource ? `Fork de "${forkSource.nombre}"` : 'Nuevo Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={createBranchData.nombre} onChange={e => setCreateBranchData(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: propuesta-v2" />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea value={createBranchData.descripcion} onChange={e => setCreateBranchData(prev => ({ ...prev, descripcion: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateBranchOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateBranch}>Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={createTagOpen} onOpenChange={setCreateTagOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear Tag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del tag</Label>
              <Input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="Ej: publicado-2026-1-v1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateTagOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTag}>Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar branch</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{deleteTarget?.nombre}" con todos sus commits y asignaciones. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBranch}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Dialog */}
      {mergeSource && principalBranch && (
        <MergeDialog
          open={!!mergeSource}
          onClose={() => setMergeSource(null)}
          sourceBranch={mergeSource}
          targetBranch={principalBranch}
          onMerged={loadData}
        />
      )}
    </div>
  )
}
