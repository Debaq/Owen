import { useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { QuickCreateDialog } from './QuickCreateDialog'
import { createNivel } from '@/features/settings/services/settingsService'
import type { Nivel } from '@/shared/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  carreraId: string
  onCreated: (nivel: Nivel) => void
}

export function QuickCreateNivel({ open, onOpenChange, carreraId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [orden, setOrden] = useState('1')
  const [semestre, setSemestre] = useState('impar')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('Nombre es requerido')
      return
    }
    setSaving(true)
    try {
      const created = await createNivel({
        carrera_id: carreraId,
        nombre: nombre.trim(),
        orden: parseInt(orden) || 1,
        semestre: semestre as 'par' | 'impar' | 'anual',
      })
      toast.success(`Nivel "${nombre}" creado`)
      setNombre(''); setOrden('1')
      onCreated(created)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear nivel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <QuickCreateDialog open={open} onOpenChange={onOpenChange} title="Nuevo Nivel">
      <div className="space-y-3 pt-2">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input placeholder="Ej: 1er Ano" value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Orden</Label>
            <Input type="number" min="1" value={orden} onChange={e => setOrden(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Semestre</Label>
            <Select value={semestre} onValueChange={setSemestre}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="impar">Impar</SelectItem>
                <SelectItem value="par">Par</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creando...' : 'Crear'}</Button>
        </div>
      </div>
    </QuickCreateDialog>
  )
}
