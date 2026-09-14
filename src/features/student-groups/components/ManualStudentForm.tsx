import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { Asignatura } from '@/shared/types'
import { createEstudiante, createInscripcion } from '../services/studentGroupService'

interface ManualStudentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asignaturas: Asignatura[]
  carreraId: string
  nivelId?: string
  temporadaId: string
  onCreated: () => void
}

export function ManualStudentForm({
  open, onOpenChange, asignaturas, carreraId, nivelId, temporadaId, onCreated
}: ManualStudentFormProps) {
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [email, setEmail] = useState('')
  const [asignaturaId, setAsignaturaId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!asignaturaId) {
      toast.error('Seleccione una asignatura')
      return
    }

    setSaving(true)
    try {
      const estId = await createEstudiante({
        nombre: nombre.trim(),
        rut: rut.trim() || undefined,
        email: email.trim() || undefined,
        carrera_id: carreraId,
        nivel_id: nivelId,
      })

      await createInscripcion({
        estudiante_id: estId,
        asignatura_id: asignaturaId,
        temporada_id: temporadaId,
      })

      toast.success('Estudiante agregado e inscrito')
      onCreated()
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear estudiante'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setRut('')
    setEmail('')
    setAsignaturaId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Agregar Estudiante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nombre *</label>
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">RUT</label>
            <Input
              value={rut}
              onChange={e => setRut(e.target.value)}
              placeholder="12.345.678-9"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="estudiante@ejemplo.cl"
              type="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Asignatura *</label>
            <Select value={asignaturaId} onValueChange={setAsignaturaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar asignatura..." />
              </SelectTrigger>
              <SelectContent>
                {asignaturas.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
