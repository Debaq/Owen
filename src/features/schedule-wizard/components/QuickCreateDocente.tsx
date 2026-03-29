import { useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { QuickCreateDialog } from './QuickCreateDialog'
import { createDocente } from '@/features/settings/services/settingsService'
import type { Docente } from '@/shared/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  carreraId?: string
  onCreated: (docente: Docente) => void
}

export function QuickCreateDocente({ open, onOpenChange, carreraId, onCreated }: Props) {
  const [rut, setRut] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!rut.trim() || !name.trim() || !email.trim()) {
      toast.error('RUT, nombre y email son requeridos')
      return
    }
    setSaving(true)
    try {
      const created = await createDocente({
        rut: rut.trim(),
        name: name.trim(),
        email: email.trim(),
        carreras: carreraId ? [carreraId] : [],
      })
      toast.success(`Docente "${name}" creado`)
      setRut(''); setName(''); setEmail('')
      onCreated(created)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear docente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <QuickCreateDialog open={open} onOpenChange={onOpenChange} title="Nuevo Docente">
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>RUT</Label>
            <Input placeholder="Ej: 12.345.678-9" value={rut} onChange={e => setRut(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nombre completo</Label>
            <Input placeholder="Ej: Juan Perez" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" placeholder="Ej: jperez@universidad.cl" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creando...' : 'Crear'}</Button>
        </div>
      </div>
    </QuickCreateDialog>
  )
}
