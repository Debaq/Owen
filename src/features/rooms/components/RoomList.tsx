import { useEffect, useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { RoomCard } from './RoomCard'
import type { RoomWithBuilding, RoomFilters } from '../services/roomService'
import { filterRooms, getRoomsWithBuildings, getAllBuildings } from '../services/roomService'
import type { Edificio } from '@/shared/types'
import { Search, Filter, X, Plus } from 'lucide-react'

interface RoomListProps {
  onRoomView?: (room: RoomWithBuilding) => void
  onRoomEdit?: (room: RoomWithBuilding) => void
  onRoomDelete?: (room: RoomWithBuilding) => void
  onCreateNew?: () => void
  showActions?: boolean
}

export function RoomList({
  onRoomView,
  onRoomEdit,
  onRoomDelete,
  onCreateNew,
  showActions = true,
}: RoomListProps) {
  const [, setRooms] = useState<RoomWithBuilding[]>([])
  const [filteredRooms, setFilteredRooms] = useState<RoomWithBuilding[]>([])
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Estados de filtros
  const [filters, setFilters] = useState<RoomFilters>({
    search: '',
    tipo: undefined,
    edificioId: undefined,
    capacidadMin: undefined,
    capacidadMax: undefined,
    equipamiento: [],
    activo: true,
  })

  // Input temporal para equipamiento
  const [newEquipFilter, setNewEquipFilter] = useState('')

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [roomsData, edificiosData] = await Promise.all([
          getRoomsWithBuildings(),
          getAllBuildings(),
        ])
        setRooms(roomsData)
        setFilteredRooms(roomsData)
        setEdificios(edificiosData)
      } catch (error) {
        console.error('Error loading rooms:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Aplicar filtros cuando cambien
  useEffect(() => {
    const applyFilters = async () => {
      const filtered = await filterRooms(filters)
      // Agregar datos de edificio
      const withBuildings = await Promise.all(
        filtered.map(async (room) => {
          const edificio = edificios.find((e) => e.id === room.edificio_id)
          return { ...room, edificio }
        })
      )
      setFilteredRooms(withBuildings)
    }
    applyFilters()
  }, [filters, edificios])

  // Handlers de filtros
  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
  }

  const handleTipoChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      tipo: value === 'all' ? undefined : (value as any),
    }))
  }

  const handleEdificioChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      edificioId: value === 'all' ? undefined : value,
    }))
  }

  const handleCapacidadMinChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      capacidadMin: value ? parseInt(value) : undefined,
    }))
  }

  const handleCapacidadMaxChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      capacidadMax: value ? parseInt(value) : undefined,
    }))
  }

  const addEquipFilter = () => {
    if (newEquipFilter.trim()) {
      setFilters((prev) => ({
        ...prev,
        equipamiento: [...(prev.equipamiento || []), newEquipFilter.trim()],
      }))
      setNewEquipFilter('')
    }
  }

  const removeEquipFilter = (index: number) => {
    setFilters((prev) => ({
      ...prev,
      equipamiento: (prev.equipamiento || []).filter((_, i) => i !== index),
    }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      tipo: undefined,
      edificioId: undefined,
      capacidadMin: undefined,
      capacidadMax: undefined,
      equipamiento: [],
      activo: true,
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.tipo ||
    filters.edificioId ||
    filters.capacidadMin ||
    filters.capacidadMax ||
    (filters.equipamiento && filters.equipamiento.length > 0)

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-4">
        {/* Búsqueda */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-blue-500' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Activos
              </Badge>
            )}
          </Button>

          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Sala
            </Button>
          )}
        </div>
      </div>

      {/* Panel de filtros colapsable */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filtros avanzados</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tipo de sala */}
            <div className="space-y-2">
              <Label>Tipo de sala</Label>
              <Select
                value={filters.tipo || 'all'}
                onValueChange={handleTipoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="laboratorio">Laboratorio</SelectItem>
                  <SelectItem value="auditorio">Auditorio</SelectItem>
                  <SelectItem value="taller">Taller</SelectItem>
                  <SelectItem value="sala_reuniones">Sala de Reuniones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Edificio */}
            <div className="space-y-2">
              <Label>Edificio</Label>
              <Select
                value={filters.edificioId || 'all'}
                onValueChange={handleEdificioChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {edificios.map((edificio) => (
                    <SelectItem key={edificio.id} value={edificio.id}>
                      {edificio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Capacidad mínima */}
            <div className="space-y-2">
              <Label>Capacidad mínima</Label>
              <Input
                type="number"
                placeholder="Ej: 20"
                value={filters.capacidadMin || ''}
                onChange={(e) => handleCapacidadMinChange(e.target.value)}
              />
            </div>

            {/* Capacidad máxima */}
            <div className="space-y-2">
              <Label>Capacidad máxima</Label>
              <Input
                type="number"
                placeholder="Ej: 50"
                value={filters.capacidadMax || ''}
                onChange={(e) => handleCapacidadMaxChange(e.target.value)}
              />
            </div>
          </div>

          {/* Filtro de equipamiento */}
          <div className="space-y-2">
            <Label>Equipamiento requerido</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: proyector, computador"
                value={newEquipFilter}
                onChange={(e) => setNewEquipFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEquipFilter()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addEquipFilter}>
                Agregar
              </Button>
            </div>
            {filters.equipamiento && filters.equipamiento.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.equipamiento.map((equip, index) => (
                  <Badge key={index} variant="secondary">
                    {equip}
                    <button
                      type="button"
                      onClick={() => removeEquipFilter(index)}
                      className="ml-2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contador de resultados */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredRooms.length} {filteredRooms.length === 1 ? 'sala' : 'salas'} encontradas
        </span>
      </div>

      {/* Grid de salas */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando salas...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? 'No se encontraron salas con los filtros aplicados'
              : 'No hay salas registradas'}
          </p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onView={onRoomView}
              onEdit={onRoomEdit}
              onDelete={onRoomDelete}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  )
}
