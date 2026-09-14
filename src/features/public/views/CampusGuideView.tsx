import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import { divIcon, Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { Search, ArrowLeft, MapPin, X, Building2, DoorOpen } from 'lucide-react'
import { getPOIs } from '@/features/map/services/mapService'
import { getAllBuildings, getAllRooms } from '@/features/rooms/services/roomService'
import {
  getPOICategoryConfig,
  type POI,
  type POICategory,
} from '@/features/map/types'
import type { Edificio, Sala } from '@/shared/types/models'
import { getPublicConfig, type SystemConfig } from '@/features/settings/services/settingsService'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-ignore
delete Icon.Default.prototype._getIconUrl
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const CAMPUS_CENTER: [number, number] = [-41.48780, -72.89699]
const DEFAULT_ZOOM = 17

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 18, { duration: 0.8 })
  }, [lat, lng, map])
  return null
}

// Agrupar categorías por secciones temáticas
const CATEGORY_GROUPS: Array<{ label: string; categories: POICategory[] }> = [
  {
    label: 'Institucional',
    categories: ['direccion', 'vicerrectoria', 'secretaria', 'asuntos_estudiantiles'],
  },
  {
    label: 'Académico',
    categories: ['biblioteca', 'auditorio', 'laboratorio_investigacion', 'museo'],
  },
  {
    label: 'Alimentación',
    categories: ['casino', 'cafeteria', 'patio_comida'],
  },
  {
    label: 'Servicios',
    categories: ['baño', 'enfermeria', 'seguridad', 'wi-fi'],
  },
  {
    label: 'Espacios',
    categories: ['sala_estar', 'gimnasio', 'area_verde', 'patio'],
  },
  {
    label: 'Acceso y Transporte',
    categories: ['estacionamiento', 'bicicletas', 'acceso', 'paradero'],
  },
  {
    label: 'Seguridad',
    categories: ['extinguidor', 'salida_emergencia', 'ascensor', 'escalera'],
  },
]

type FocusTarget =
  | { type: 'poi'; data: POI }
  | { type: 'edificio'; data: Edificio }
  | { type: 'sala'; data: Sala; edificio?: Edificio }

export function CampusGuideView() {
  const navigate = useNavigate()
  const [pois, setPois] = useState<POI[]>([])
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<POICategory | null>(null)
  const [focused, setFocused] = useState<FocusTarget | null>(null)
  const [siteConfig, setSiteConfig] = useState<SystemConfig>({})
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [poisData, edificiosData, salasData, config] = await Promise.all([
          getPOIs(),
          getAllBuildings().catch(() => []),
          getAllRooms().catch(() => []),
          getPublicConfig().catch(() => ({}) as SystemConfig),
        ])
        setPois(poisData)
        setEdificios(edificiosData)
        setSalas(salasData)
        setSiteConfig(config)
      } catch {
        setPois([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filtrar POIs
  const filteredPOIs = useMemo(() => {
    let result = pois
    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        p => p.name.toLowerCase().includes(q) ||
             (p.description && p.description.toLowerCase().includes(q))
      )
    }
    return result
  }, [pois, activeCategory, searchQuery])

  // Búsqueda de edificios y salas (solo cuando hay query de texto)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return { edificios: [] as Edificio[], salas: [] as (Sala & { edificio?: Edificio })[] }
    const q = searchQuery.toLowerCase()

    const matchedEdificios = edificios.filter(
      e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    )

    const matchedSalas = salas
      .filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .map(s => ({ ...s, edificio: edificios.find(e => e.id === s.edificio_id) }))

    return { edificios: matchedEdificios, salas: matchedSalas }
  }, [searchQuery, edificios, salas])

  const totalSearchResults = filteredPOIs.length + searchResults.edificios.length + searchResults.salas.length

  // Contar POIs por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    pois.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1 })
    return counts
  }, [pois])

  const categoriesWithPOIs = useMemo(() => new Set(pois.map(p => p.category)), [pois])

  const focusCoords = useMemo<{ lat: number; lng: number } | null>(() => {
    if (!focused) return null
    if (focused.type === 'poi') return { lat: focused.data.lat, lng: focused.data.lng }
    if (focused.type === 'edificio') return { lat: focused.data.lat, lng: focused.data.lng }
    if (focused.type === 'sala') {
      const s = focused.data
      if (s.lat && s.lng) return { lat: s.lat, lng: s.lng }
      if (focused.edificio) return { lat: focused.edificio.lat, lng: focused.edificio.lng }
    }
    return null
  }, [focused])

  const handlePOIClick = useCallback((poi: POI) => {
    setFocused({ type: 'poi', data: poi })
    if (window.innerWidth < 1024) {
      document.getElementById('campus-map')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const handleEdificioClick = useCallback((edificio: Edificio) => {
    setFocused({ type: 'edificio', data: edificio })
    if (window.innerWidth < 1024) {
      document.getElementById('campus-map')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const handleSalaClick = useCallback((sala: Sala, edificio?: Edificio) => {
    setFocused({ type: 'sala', data: sala, edificio })
    if (window.innerWidth < 1024) {
      document.getElementById('campus-map')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const handleCategoryClick = useCallback((cat: POICategory) => {
    setActiveCategory(prev => prev === cat ? null : cat)
    setFocused(null)
    if (listRef.current) listRef.current.scrollTop = 0
  }, [])

  const clearFilters = useCallback(() => {
    setActiveCategory(null)
    setSearchQuery('')
    setFocused(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Cargando guía del campus...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {siteConfig.site_name || 'Campus'} - Lugares de Interés
                </h1>
                <p className="text-xs text-gray-500">Encuentra servicios, salas, edificios y espacios del campus</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Barra de búsqueda + filtros */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar sala, edificio o lugar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {(activeCategory || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Limpiar
              </Button>
            )}
          </div>

          {activeCategory && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Filtro:</span>
              <Badge
                className="cursor-pointer"
                style={{ backgroundColor: getPOICategoryConfig(activeCategory).color, color: 'white' }}
                onClick={() => setActiveCategory(null)}
              >
                {getPOICategoryConfig(activeCategory).icon} {getPOICategoryConfig(activeCategory).label}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* Panel izquierdo */}
          <div className="lg:col-span-2 space-y-4">
            {/* Categorías: solo cuando no hay búsqueda activa */}
            {!searchQuery && !activeCategory && (
              <div className="space-y-3">
                {CATEGORY_GROUPS.map(group => {
                  const groupCats = group.categories.filter(c => categoriesWithPOIs.has(c))
                  if (groupCats.length === 0) return null
                  return (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {groupCats.map(cat => {
                          const config = getPOICategoryConfig(cat)
                          return (
                            <button
                              key={cat}
                              onClick={() => handleCategoryClick(cat)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border hover:shadow-sm transition-all bg-white"
                              style={{ borderColor: config.color }}
                            >
                              <span>{config.icon}</span>
                              <span className="font-medium">{config.label}</span>
                              <span className="text-xs text-gray-400">({categoryCounts[cat] || 0})</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {(() => {
                  const groupedCats = new Set(CATEGORY_GROUPS.flatMap(g => g.categories))
                  const ungrouped = Array.from(categoriesWithPOIs).filter(c => !groupedCats.has(c))
                  if (ungrouped.length === 0) return null
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Otros</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ungrouped.map(cat => {
                          const config = getPOICategoryConfig(cat)
                          return (
                            <button
                              key={cat}
                              onClick={() => handleCategoryClick(cat)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border hover:shadow-sm transition-all bg-white"
                              style={{ borderColor: config.color }}
                            >
                              <span>{config.icon}</span>
                              <span className="font-medium">{config.label}</span>
                              <span className="text-xs text-gray-400">({categoryCounts[cat] || 0})</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Lista de resultados */}
            {(activeCategory || searchQuery) && (
              <div ref={listRef} className="space-y-2 max-h-[60vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                <p className="text-sm text-gray-500">
                  {searchQuery.trim().length >= 2
                    ? `${totalSearchResults} resultado${totalSearchResults !== 1 ? 's' : ''}`
                    : `${filteredPOIs.length} lugar${filteredPOIs.length !== 1 ? 'es' : ''}`}
                </p>

                {/* Edificios encontrados */}
                {searchResults.edificios.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase mt-2">Edificios</p>
                    {searchResults.edificios.map(e => (
                      <Card
                        key={`e-${e.id}`}
                        className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                          focused?.type === 'edificio' && focused.data.id === e.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                        }`}
                        onClick={() => handleEdificioClick(e)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-lg flex-shrink-0">
                            🏢
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm">{e.code} — {e.name}</h3>
                            <p className="text-xs text-gray-500">{e.pisos} pisos{e.descripcion ? ` · ${e.descripcion}` : ''}</p>
                          </div>
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </Card>
                    ))}
                  </>
                )}

                {/* Salas encontradas */}
                {searchResults.salas.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase mt-2">Salas</p>
                    {searchResults.salas.map(s => (
                      <Card
                        key={`s-${s.id}`}
                        className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                          focused?.type === 'sala' && focused.data.id === s.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                        }`}
                        onClick={() => handleSalaClick(s, s.edificio)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white text-lg flex-shrink-0">
                            🚪
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm">{s.code} — {s.name}</h3>
                            <p className="text-xs text-gray-500">
                              {s.edificio ? s.edificio.name : 'Sin edificio'} · P{s.piso} · {s.capacidad} pers.
                            </p>
                          </div>
                          <DoorOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </Card>
                    ))}
                  </>
                )}

                {/* POIs */}
                {filteredPOIs.length > 0 && searchQuery.trim().length >= 2 && (
                  <p className="text-xs font-semibold text-gray-400 uppercase mt-2">Lugares de interés</p>
                )}
                {filteredPOIs.map(poi => {
                  const config = getPOICategoryConfig(poi.category)
                  const isFocused = focused?.type === 'poi' && focused.data.id === poi.id
                  return (
                    <Card
                      key={poi.id}
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${isFocused ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
                      onClick={() => handlePOIClick(poi)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                          style={{ backgroundColor: poi.color || config.color, opacity: 0.9 }}
                        >
                          {poi.icon || config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{poi.name}</h3>
                          <p className="text-xs text-gray-500">{config.label}</p>
                          {poi.description && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{poi.description}</p>
                          )}
                        </div>
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </Card>
                  )
                })}

                {totalSearchResults === 0 && filteredPOIs.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No se encontraron resultados</p>
                  </div>
                )}
              </div>
            )}

            {pois.length === 0 && edificios.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No hay lugares registrados aún</p>
              </div>
            )}
          </div>

          {/* Panel derecho: mapa */}
          <div id="campus-map" className="lg:col-span-3">
            <div className="sticky top-24 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
              <MapContainer
                center={CAMPUS_CENTER}
                zoom={DEFAULT_ZOOM}
                maxZoom={18}
                style={{ height: 'calc(100vh - 220px)', minHeight: '400px', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={18}
                />

                {/* Centrar en elemento seleccionado */}
                {focusCoords && <FlyTo lat={focusCoords.lat} lng={focusCoords.lng} />}

                {/* Edificios — siempre visibles */}
                {edificios.map(e => {
                  if (!e.lat || !e.lng) return null
                  const isFocused = focused?.type === 'edificio' && focused.data.id === e.id
                  const icon = divIcon({
                    html: `
                      <div style="
                        background-color: #2563eb;
                        width: ${isFocused ? '44px' : '36px'};
                        height: ${isFocused ? '44px' : '36px'};
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: ${isFocused ? '22px' : '18px'};
                        border: ${isFocused ? '3px solid #1d4ed8' : '2px solid white'};
                        box-shadow: ${isFocused ? '0 0 12px rgba(37,99,235,0.5)' : '0 2px 4px rgba(0,0,0,0.3)'};
                      ">🏢</div>
                    `,
                    className: '',
                    iconSize: [isFocused ? 44 : 36, isFocused ? 44 : 36],
                    iconAnchor: [isFocused ? 22 : 18, isFocused ? 22 : 18],
                  })
                  return (
                    <Marker key={`e-${e.id}`} position={[e.lat, e.lng]} icon={icon}>
                      <Tooltip permanent direction="top" offset={[0, -18]}>
                        <div className="text-center">
                          <div className="font-bold text-xs">{e.name}</div>
                          <div className="text-[10px] text-gray-500">{e.code}</div>
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-sm">🏢 {e.name}</h3>
                          <p className="text-xs text-gray-500">{e.code} · {e.pisos} pisos</p>
                          {e.descripcion && <p className="text-xs text-gray-600 mt-1">{e.descripcion}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

                {/* POIs */}
                {(activeCategory || searchQuery ? filteredPOIs : pois).map(poi => {
                  const config = getPOICategoryConfig(poi.category)
                  const iconEmoji = poi.icon || config.icon
                  const markerColor = poi.color || config.color
                  const isFocused = focused?.type === 'poi' && focused.data.id === poi.id

                  const showAll = !activeCategory && !searchQuery
                  const size = isFocused ? 40 : (showAll ? 28 : 32)

                  const icon = divIcon({
                    html: `
                      <div style="
                        background-color: ${markerColor};
                        width: ${size}px;
                        height: ${size}px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: ${isFocused ? '22px' : (showAll ? '15px' : '18px')};
                        border: ${isFocused ? '3px solid #2563eb' : '2px solid white'};
                        box-shadow: ${isFocused ? '0 0 12px rgba(37,99,235,0.5)' : '0 2px 4px rgba(0,0,0,0.3)'};
                      ">${iconEmoji}</div>
                    `,
                    className: '',
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                  })

                  return (
                    <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icon}>
                      <Tooltip permanent={isFocused} direction="top" offset={[0, -(size / 2)]}>
                        <span className="text-xs font-semibold">{poi.name}</span>
                      </Tooltip>
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{iconEmoji}</span>
                            <div>
                              <h3 className="font-bold text-sm">{poi.name}</h3>
                              <p className="text-xs text-gray-500">{config.label}</p>
                            </div>
                          </div>
                          {poi.description && <p className="text-sm text-gray-700 mt-1">{poi.description}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
          <p>{siteConfig.site_footer || 'Sistema OWEN'}</p>
        </div>
      </footer>
    </div>
  )
}
