import { useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { QuickCreateDialog } from './QuickCreateDialog'
import { createCarrera } from '@/features/settings/services/settingsService'
import type { Carrera } from '@/shared/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (carrera: Carrera) => void
}

export function QuickCreateCarrera({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Nombre y codigo son requeridos')
      return
    }
    setSaving(true)
    try {
      const created = await createCarrera({ name: name.trim(), code: code.trim().toUpperCase() })
      toast.success(`Carrera "${name}" creada`)
      setName(''); setCode('')
      onCreated(created)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear carrera')
    } finally {
      setSaving(false)
    }
  }

  return (
    <QuickCreateDialog open={open} onOpenChange={onOpenChange} title="Nueva Carrera">
      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input placeholder="Ej: Ingenieria en Informatica" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Codigo</Label>
          <Input placeholder="Ej: IINF" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creando...' : 'Crear'}</Button>
        </div>
      </div>
    </QuickCreateDialog>
  )
}
