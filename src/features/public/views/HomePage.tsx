import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CampusMap } from '@/features/map/components/CampusMap'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Label } from '@/shared/components/ui/label'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'
import { getPublicConfig, type SystemConfig } from '@/features/settings/services/settingsService'
import { Building2, Users, MapPin, Search, Loader2, GraduationCap } from 'lucide-react'

interface RoomResult {
  id: string
  code: string
  name: string
  tipo: string
  capacidad: number
  piso: number
  edificio_name: string
  edificio_code: string
}

interface Carrera {
  id: string
  name: string
  code: string
}

interface Nivel {
  id: string
  carrera_id: string
  nombre: string
  orden: number
  semestre: string
}

const TIPO_LABELS: Record<string, string> = {
  aula: 'Aula',
  laboratorio: 'Laboratorio',
  auditorio: 'Auditorio',
  taller: 'Taller',
  sala_reuniones: 'Sala Reuniones',
  oficina: 'Oficina',
  biblioteca: 'Biblioteca',
  medioteca: 'Medioteca',
}

type SearchTab = 'salas' | 'carrera'

export function HomePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<SearchTab>('salas')
  const [siteConfig, setSiteConfig] = useState<SystemConfig>({})

  // Busqueda por sala
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<RoomResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  // Busqueda por carrera/nivel
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState('')
  const [selectedNivel, setSelectedNivel] = useState('')
  const [carreraResults, setCarreraResults] = useState<RoomResult[]>([])
  const [searchingCarrera, setSearchingCarrera] = useState(false)
  const [searchedCarrera, setSearchedCarrera] = useState(false)

  // Cargar carreras y config al montar
  useEffect(() => {
    api.get<ApiResponse<Carrera[]>>('/public.php?action=carreras')
      .then(res => setCarreras(res.data.data || []))
      .catch(() => {})
    getPublicConfig().then(setSiteConfig).catch(() => {})
  }, [])

  // Cargar niveles cuando cambia la carrera
  useEffect(() => {
    if (!selectedCarrera) {
      setNiveles([])
      setSelectedNivel('')
      return
    }
    api.get<ApiResponse<Nivel[]>>(`/public.php?action=niveles&carrera_id=${selectedCarrera}`)
      .then(res => setNiveles(res.data.data || []))
      .catch(() => setNiveles([]))
  }, [selectedCarrera])

  // Buscar salas cuando cambia el nivel
  useEffect(() => {
    if (!selectedNivel) {
      setCarreraResults([])
      setSearchedCarrera(false)
      return
    }
    setSearchingCarrera(true)
    setSearchedCarrera(true)
    api.get<ApiResponse<RoomResult[]>>(`/public.php?action=rooms_by_nivel&nivel_id=${selectedNivel}`)
      .then(res => setCarreraResults(res.data.data || []))
      .catch(() => setCarreraResults([]))
      .finally(() => setSearchingCarrera(false))
  }, [selectedNivel])

  const handleSearch = async (query?: string, tipo?: string) => {
    const q = query ?? searchQuery
    if (!q.trim() && !tipo) return

    setSearching(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.append('search', q.trim())
      if (tipo) params.append('tipo', tipo)

      const res = await api.get<ApiResponse<RoomResult[]>>(`/public.php?action=rooms&${params.toString()}`)
      setResults(res.data.data || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleFilterByType = (tipo: string) => {
    setSearchQuery('')
    handleSearch('', tipo)
  }

  const RoomResultItem = ({ room }: { room: RoomResult }) => (
    <div
      onClick={() => navigate(`/public/room/${room.id}`)}
      className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-sm">{room.code} - {room.name}</p>
          <p className="text-xs text-gray-500">
            <MapPin className="h-3 w-3 inline mr-1" />
            {room.edificio_name} - Piso {room.piso}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{TIPO_LABELS[room.tipo] || room.tipo}</Badge>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Users className="h-3 w-3" /> {room.capacidad}
        </div>
      </div>
    </div>
  )

  const ResultsList = ({ items, loading, didSearch }: { items: RoomResult[]; loading: boolean; didSearch: boolean }) => {
    if (!didSearch) return null

    if (loading) {
      return (
        <div className="text-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-gray-500 mt-2">Buscando...</p>
        </div>
      )
    }

    if (items.length === 0) {
      return <p className="text-center text-gray-500 py-6">No se encontraron salas</p>
    }

    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 mb-3">
          {items.length} sala{items.length !== 1 ? 's' : ''} encontrada{items.length !== 1 ? 's' : ''}
        </p>
        {items.map(room => <RoomResultItem key={room.id} room={room} />)}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{siteConfig.site_name || 'Sistema OWEN'}</h1>
              <p className="text-sm text-gray-600">{siteConfig.site_subtitle || 'Sistema de Horarios'}</p>
            </div>
            <Button onClick={() => navigate('/login')} variant="outline">
              Iniciar Sesion
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Buscador Principal */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Buscar Salas y Horarios</h2>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5">
            <button
              onClick={() => setTab('salas')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'salas' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-4 w-4" /> Por Sala
            </button>
            <button
              onClick={() => setTab('carrera')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'carrera' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="h-4 w-4" /> Por Carrera / Nivel
            </button>
          </div>

          {/* Tab: Buscar por sala */}
          {tab === 'salas' && (
            <>
              <div className="flex gap-3 mb-4">
                <Input
                  placeholder="Buscar sala por codigo, nombre o edificio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={() => handleSearch()} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Buscar</span>
                </Button>
              </div>

              {/* Filtros por tipo */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(TIPO_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterByType(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="mt-6">
                <ResultsList items={results} loading={searching} didSearch={searched} />
              </div>
            </>
          )}

          {/* Tab: Buscar por carrera/nivel */}
          {tab === 'carrera' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Carrera</Label>
                  <Select value={selectedCarrera} onValueChange={(v) => { setSelectedCarrera(v); setSelectedNivel('') }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una carrera..." />
                    </SelectTrigger>
                    <SelectContent>
                      {carreras.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nivel</Label>
                  <Select
                    value={selectedNivel}
                    onValueChange={setSelectedNivel}
                    disabled={!selectedCarrera || niveles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedCarrera ? 'Selecciona carrera primero' : 'Selecciona un nivel...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {niveles.map(n => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCarrera && !selectedNivel && niveles.length > 0 && (
                <p className="text-sm text-gray-500 mb-4">Selecciona un nivel para ver las salas con horarios asignados</p>
              )}

              {selectedCarrera && niveles.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">Esta carrera no tiene niveles registrados</p>
              )}

              <div className="mt-2">
                <ResultsList items={carreraResults} loading={searchingCarrera} didSearch={searchedCarrera} />
              </div>
            </>
          )}
        </Card>

        {/* Guía del Campus */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-900">Lugares de Interés</h2>
              <p className="text-sm text-blue-700 mt-1">
                Encuentra secretarías, casinos, bibliotecas, estacionamientos y más
              </p>
            </div>
            <Button onClick={() => navigate('/campus')} className="bg-blue-600 hover:bg-blue-700">
              <MapPin className="h-4 w-4 mr-2" />
              Explorar Campus
            </Button>
          </div>
        </Card>

        {/* Mapa del Campus */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Mapa del Campus</h2>
            <p className="text-sm text-gray-600 mt-1">
              Explora las instalaciones, encuentra salas y puntos de interes
            </p>
          </div>
          <CampusMap height="600px" />
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>{siteConfig.site_footer || 'Sistema OWEN'}</p>
          <p className="mt-1">
            <a href="/report" className="text-blue-600 hover:underline">Reportar observacion</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
