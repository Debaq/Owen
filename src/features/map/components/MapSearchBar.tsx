import { useState, useRef, useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import { Search, X, Building2, DoorOpen, MapPin } from 'lucide-react'
import type { Edificio, Sala } from '@/shared/types/models'
import type { POI } from '../types'
import { getPOICategoryConfig } from '../types'

interface MapSearchBarProps {
  edificios: Edificio[]
  salas: Sala[]
  pois: POI[]
}

type ResultType = 'edificio' | 'sala' | 'poi'

interface SearchResult {
  type: ResultType
  id: string
  label: string
  sublabel: string
  lat: number
  lng: number
  icon: React.ReactNode
}

export function MapSearchBar({ edificios, salas, pois }: MapSearchBarProps) {
  const map = useMap()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const out: SearchResult[] = []

    // Edificios
    for (const e of edificios) {
      if (e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)) {
        out.push({
          type: 'edificio',
          id: e.id,
          label: `${e.code} — ${e.name}`,
          sublabel: `${e.pisos} pisos`,
          lat: e.lat,
          lng: e.lng,
          icon: <Building2 className="h-4 w-4 text-blue-600" />,
        })
      }
    }

    // Salas — usa coords de la sala, o del edificio como fallback
    for (const s of salas) {
      if (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      ) {
        const edificio = edificios.find(e => e.id === s.edificio_id)
        const lat = (s.lat && s.lng) ? s.lat : edificio?.lat
        const lng = (s.lat && s.lng) ? s.lng : edificio?.lng
        if (lat && lng) {
          out.push({
            type: 'sala',
            id: s.id,
            label: `${s.code} — ${s.name}`,
            sublabel: edificio ? `${edificio.name} · P${s.piso}` : `Piso ${s.piso}`,
            lat,
            lng,
            icon: <DoorOpen className="h-4 w-4 text-green-600" />,
          })
        }
      }
    }

    // POIs
    for (const p of pois) {
      if (p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))) {
        const config = getPOICategoryConfig(p.category)
        out.push({
          type: 'poi',
          id: p.id,
          label: p.name,
          sublabel: config.label,
          lat: p.lat,
          lng: p.lng,
          icon: <MapPin className="h-4 w-4 text-orange-600" />,
        })
      }
    }

    return out.slice(0, 15)
  }, [query, edificios, salas, pois])

  const handleSelect = (r: SearchResult) => {
    map.flyTo([r.lat, r.lng], 18, { duration: 0.7 })
    setQuery('')
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      className="absolute top-3 left-3 z-[1000] w-72"
      // Evitar que clicks en el buscador se propaguen al mapa
      onMouseDown={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar sala, edificio o lugar..."
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="mt-1 bg-white rounded-lg shadow-lg border max-h-72 overflow-y-auto">
          {results.map(r => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0"
            >
              <div className="flex-shrink-0">{r.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.label}</div>
                <div className="text-xs text-gray-500 truncate">{r.sublabel}</div>
              </div>
              <span className="text-[9px] text-gray-400 uppercase flex-shrink-0">
                {r.type === 'edificio' ? 'Edificio' : r.type === 'sala' ? 'Sala' : 'POI'}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="mt-1 bg-white rounded-lg shadow-lg border px-3 py-4 text-center text-sm text-gray-500">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}
