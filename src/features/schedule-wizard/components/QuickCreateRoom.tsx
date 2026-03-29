import { useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { QuickCreateDialog } from './QuickCreateDialog'
import { QuickCreateBuilding } from './QuickCreateBuilding'
import { createRoom } from '@/features/rooms/services/roomService'
import type { Sala, Edificio } from '@/shared/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  edificios: Edificio[]
  onCreated: (sala: Sala) => void
  onEdificiosChange: (edificios: Edificio[]) => void
}

export function QuickCreateRoom({ open, onOpenChange, edificios, onCreated, onEdificiosChange }: Props) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [edificioId, setEdificioId] = useState('')
  const [piso, setPiso] = useState('1')
  const [tipo, setTipo] = useState<string>('aula')
  const [capacidad, setCapacidad] = useState('30')
  const [saving, setSaving] = useState(false)
  const [showCreateBuilding, setShowCreateBuilding] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim() || !edificioId) {
      toast.error('Codigo, nombre y edificio son requeridos')
      return
    }
    setSaving(true)
    try {
      const newRoom = await createRoom({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        edificio_id: edificioId,
        piso: parseInt(piso) || 1,
        tipo: tipo as Sala['tipo'],
        capacidad: parseInt(capacidad) || 30,
        mobiliario: [],
        equipamiento: [],
        reglas: '',
        lat: 0,
        lng: 0,
        tipo_gestion: 'central',
        activo: true,
      })
      toast.success(`Sala "${code}" creada`)
      setCode(''); setName(''); setPiso('1'); setCapacidad('30')
      onCreated(newRoom)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear sala')
    } finally {
      setSaving(false)
    }
  }

  const handleBuildingCreated = (newBuilding: Edificio) => {
    onEdificiosChange([...edificios, newBuilding])
    setEdificioId(newBuilding.id)
  }

  return (
    <>
      <QuickCreateDialog open={open} onOpenChange={onOpenChange} title="Nueva Sala" description="Crea una sala rapido para asignar horarios">
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Codigo</Label>
              <Input placeholder="Ej: A-201" value={code} onChange={e => setCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Sala de Clases 201" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Edificio</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowCreateBuilding(true)}>
                <Plus className="h-3 w-3 mr-1" /> Nuevo
              </Button>
            </div>
            <Select value={edificioId} onValueChange={setEdificioId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar edificio..." /></SelectTrigger>
              <SelectContent>
                {edificios.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.code} - {e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Piso</Label>
              <Input type="number" min="1" value={piso} onChange={e => setPiso(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="laboratorio">Laboratorio</SelectItem>
                  <SelectItem value="auditorio">Auditorio</SelectItem>
                  <SelectItem value="taller">Taller</SelectItem>
                  <SelectItem value="sala_reuniones">Reuniones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Capacidad</Label>
              <Input type="number" min="1" value={capacidad} onChange={e => setCapacidad(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creando...' : 'Crear Sala'}</Button>
          </div>
        </div>
      </QuickCreateDialog>

      <QuickCreateBuilding
        open={showCreateBuilding}
        onOpenChange={setShowCreateBuilding}
        onCreated={handleBuildingCreated}
      />
    </>
  )
}
