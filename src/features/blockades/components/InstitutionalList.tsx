import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog'
import { getInstitutionalBlockades, createInstitutionalBlockade, deleteInstitutionalBlockade } from '../services/blockadeService'
import type { BloqueoInstitucional } from '@/shared/types'

interface Props {
  temporadaId: string
}

export function InstitutionalList({ temporadaId }: Props) {
  const [blockades, setBlockades] = useState<BloqueoInstitucional[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', motivo: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (temporadaId) loadBlockades()
  }, [temporadaId])

  const loadBlockades = async () => {
    try {
      const data = await getInstitutionalBlockades(temporadaId)
      setBlockades(data)
    } catch { /* ignore */ }
  }

  const handleCreate = async () => {
    if (!formData.nombre || !formData.fecha_inicio || !formData.fecha_fin) {
      toast.error('Nombre, fecha inicio y fecha fin son requeridos')
      return
    }

    setLoading(true)
    try {
      await createInstitutionalBlockade({
        ...formData,
        temporada_id: temporadaId,
      })
      toast.success('Evento creado')
      setDialogOpen(false)
      setFormData({ nombre: '', fecha_inicio: '', fecha_fin: '', motivo: '' })
      await loadBlockades()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear evento')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteInstitutionalBlockade(id)
      toast.success('Evento eliminado')
      await loadBlockades()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Eventos Institucionales</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Fechas donde se bloquean todas las salas del campus (elecciones, PAES, ceremonias).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {blockades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay eventos institucionales registrados</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockades.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nombre}</TableCell>
                  <TableCell>{b.fecha_inicio}</TableCell>
                  <TableCell>{b.fecha_fin}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.motivo || '-'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará "{b.nombre}". Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(b.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Evento Institucional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del evento</Label>
              <Input
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Elecciones municipales"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={formData.motivo}
                onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Descripción del evento..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
