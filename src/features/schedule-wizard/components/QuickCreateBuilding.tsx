import { useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { QuickCreateDialog } from './QuickCreateDialog'
import { api } from '@/shared/lib/api'
import type { Edificio } from '@/shared/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (edificio: Edificio) => void
}

export function QuickCreateBuilding({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [pisos, setPisos] = useState('1')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Nombre y codigo son requeridos')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/edificios.php', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        pisos: parseInt(pisos) || 1,
        lat: -41.4878,
        lng: -72.89699,
      })
      const created = res.data.data
      toast.success(`Edificio "${name}" creado`)
      setName(''); setCode(''); setPisos('1')
      onCreated(created)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear edificio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <QuickCreateDialog open={open} onOpenChange={onOpenChange} title="Nuevo Edificio" description="Crea un edificio rapido para asignar salas">
      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input placeholder="Ej: Edificio Principal" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Codigo</Label>
            <Input placeholder="Ej: EP" value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Pisos</Label>
            <Input type="number" min="1" value={pisos} onChange={e => setPisos(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creando...' : 'Crear Edificio'}</Button>
        </div>
      </div>
    </QuickCreateDialog>
  )
}
