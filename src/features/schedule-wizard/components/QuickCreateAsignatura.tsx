import { useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { QuickCreateDialog } from './QuickCreateDialog'
import { createAsignatura } from '@/features/settings/services/settingsService'
import type { Asignatura } from '@/shared/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  carreraId: string
  nivelId: string
  onCreated: (asignatura: Asignatura) => void
}

export function QuickCreateAsignatura({ open, onOpenChange, carreraId, nivelId, onCreated }: Props) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [horasSemanales, setHorasSemanales] = useState('4')
  const [creditos, setCreditos] = useState('4')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Codigo y nombre son requeridos')
      return
    }
    setSaving(true)
    try {
      const horas = parseInt(horasSemanales) || 4
      const created = await createAsignatura({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        carrera_id: carreraId,
        nivel_id: nivelId,
        horas_semanales: horas,
        horas_teoria: horas,
        horas_practica: 0,
        horas_autonomas: 0,
        creditos: parseInt(creditos) || 4,
        duracion_semanas: 16,
        semana_inicio: 1,
      })
      toast.success(`Asignatura "${code}" creada`)
      setCode(''); setName(''); setHorasSemanales('4'); setCreditos('4')
      onCreated(created)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear asignatura')
    } finally {
      setSaving(false)
    }
  }

  return (
    <QuickCreateDialog open={open} onOpenChange={onOpenChange} title="Nueva Asignatura">
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Codigo</Label>
            <Input placeholder="Ej: INF-101" value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input placeholder="Ej: Programacion I" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Horas semanales</Label>
            <Input type="number" min="1" value={horasSemanales} onChange={e => setHorasSemanales(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Creditos</Label>
            <Input type="number" min="1" value={creditos} onChange={e => setCreditos(e.target.value)} />
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
