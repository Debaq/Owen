import { useState, useEffect } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { getAllRooms, getAllBuildings } from '@/features/rooms/services/roomService'
import type { Sala, Edificio } from '@/shared/types'
import { Search, Plus, Building2, Users, Check } from 'lucide-react'
import { QuickCreateRoom } from './QuickCreateRoom'
import { cn } from '@/shared/lib/utils'

const TIPO_LABELS: Record<string, string> = {
  aula: 'Aula', laboratorio: 'Lab', auditorio: 'Auditorio', taller: 'Taller',
  sala_reuniones: 'Reuniones', oficina: 'Oficina', biblioteca: 'Biblioteca', medioteca: 'Medioteca',
}

interface StepRoomProps {
  selectedRoom: Sala | null
  onSelect: (room: Sala) => void
}

export function StepRoom({ selectedRoom, onSelect }: StepRoomProps) {
  const [rooms, setRooms] = useState<Sala[]>([])
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [r, e] = await Promise.all([getAllRooms(), getAllBuildings()])
    setRooms(r)
    setEdificios(e)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const edificioMap = new Map(edificios.map(e => [e.id, e]))

  const filtered = rooms.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    const edif = edificioMap.get(r.edificio_id)
    return r.code.toLowerCase().includes(q) ||
           r.name.toLowerCase().includes(q) ||
           (edif && edif.name.toLowerCase().includes(q))
  })

  // Agrupar por edificio
  const grouped = new Map<string, { edificio: Edificio | undefined; salas: Sala[] }>()
  filtered.forEach(sala => {
    const eid = sala.edificio_id
    if (!grouped.has(eid)) {
      grouped.set(eid, { edificio: edificioMap.get(eid), salas: [] })
    }
    grouped.get(eid)!.salas.push(sala)
  })

  const handleCreated = (newRoom: Sala) => {
    setShowCreate(false)
    setRooms(prev => [...prev, newRoom])
    onSelect(newRoom)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Selecciona una sala</h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Sala
        </Button>
      </div>

      {/* Busqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por codigo, nombre o edificio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando salas...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No se encontraron salas</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
          {Array.from(grouped.entries()).map(([eid, group]) => (
            <div key={eid}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">
                  {group.edificio?.name || 'Sin edificio'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.salas.map(sala => {
                  const isSelected = selectedRoom?.id === sala.id
                  return (
                    <button
                      key={sala.id}
                      onClick={() => onSelect(sala)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border text-left transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{sala.code}</span>
                          <Badge variant="outline" className="text-[10px]">{TIPO_LABELS[sala.tipo] || sala.tipo}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{sala.name}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Users className="h-3 w-3" /> {sala.capacidad}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick create */}
      <QuickCreateRoom
        open={showCreate}
        onOpenChange={setShowCreate}
        edificios={edificios}
        onCreated={handleCreated}
        onEdificiosChange={setEdificios}
      />
    </div>
  )
}
