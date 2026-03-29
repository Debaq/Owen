import { useState, useEffect, useRef } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'
import { Search, X, MapPin, Building2 } from 'lucide-react'

export interface SearchResultRoom {
  id: string
  code: string
  name: string
  tipo: string
  capacidad: number
  piso: number
  lat: number
  lng: number
  edificio_name: string
  edificio_code: string
}

interface RoomSearchBarProps {
  excludeRoomId: string
  onSelect: (room: SearchResultRoom) => void
  selectedRoom: SearchResultRoom | null
  onClear: () => void
}

export function RoomSearchBar({ excludeRoomId, onSelect, selectedRoom, onClear }: RoomSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultRoom[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get<ApiResponse<SearchResultRoom[]>>(
          `/public.php?action=rooms&search=${encodeURIComponent(query.trim())}`
        )
        const filtered = (res.data.data || []).filter(r => r.id !== excludeRoomId)
        setResults(filtered)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, excludeRoomId])

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (selectedRoom) {
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <div>
            <span className="font-semibold text-sm">{selectedRoom.code} - {selectedRoom.name}</span>
            <span className="text-xs text-gray-500 ml-2">{selectedRoom.edificio_name}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar sala destino..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="pl-10"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {results.map(room => (
            <button
              key={room.id}
              onClick={() => {
                onSelect(room)
                setQuery('')
                setShowResults(false)
              }}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 text-left border-b last:border-0"
            >
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{room.code} - {room.name}</p>
                <p className="text-xs text-gray-500">{room.edificio_name} - Piso {room.piso}</p>
              </div>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">{room.tipo}</Badge>
            </button>
          ))}
        </div>
      )}

      {showResults && query.trim() && !searching && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No se encontraron salas
        </div>
      )}
    </div>
  )
}
