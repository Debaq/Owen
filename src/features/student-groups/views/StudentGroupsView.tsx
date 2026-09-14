import { useState, useEffect, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { FileSpreadsheet, UserPlus, Users, LayoutGrid, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Carrera, Nivel, Asignatura, Seccion, Inscripcion, ConflictoHorario, SortingStatus } from '@/shared/types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ImportExcelDialog } from '../components/ImportExcelDialog'
import { ManualStudentForm } from '../components/ManualStudentForm'
import { StudentList } from '../components/StudentList'
import { SortingControls } from '../components/SortingControls'
import { SectionAssignments } from '../components/SectionAssignments'
import { ConflictsList } from '../components/ConflictsList'
import { getInscripciones, getSortingStatus, getSortingConflicts } from '../services/studentGroupService'

interface Temporada {
  id: string
  nombre: string
  activa: number
}

export function StudentGroupsView() {
  const { user } = useAuth()

  // Selectores
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [secciones, setSecciones] = useState<Seccion[]>([])

  const [selectedTemporada, setSelectedTemporada] = useState('')
  const [selectedCarrera, setSelectedCarrera] = useState('')
  const [selectedNivel, setSelectedNivel] = useState('')
  const [selectedAsigTab, setSelectedAsigTab] = useState('')

  // Datos
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [sortingStatus, setSortingStatus] = useState<SortingStatus | null>(null)
  const [conflictos, setConflictos] = useState<ConflictoHorario[]>([])
  const [loadingConflicts, setLoadingConflicts] = useState(false)

  // Modales
  const [showImport, setShowImport] = useState(false)
  const [showManual, setShowManual] = useState(false)

  // Cargar temporadas y carreras iniciales
  useEffect(() => {
    Promise.all([
      api.get('/temporadas.php'),
      api.get('/carreras.php'),
    ]).then(([tempRes, carrRes]) => {
      const temps = tempRes.data.data || []
      setTemporadas(temps)
      const activa = temps.find((t: Temporada) => t.activa)
      if (activa) setSelectedTemporada(activa.id)

      const carrs = carrRes.data.data || []
      setCarreras(carrs)

      // Si es dirección, auto-seleccionar su carrera
      if (user?.role === 'direccion' && user.carrera_id) {
        setSelectedCarrera(user.carrera_id)
      } else if (carrs.length === 1) {
        setSelectedCarrera(carrs[0].id)
      }
    }).catch(() => toast.error('Error al cargar datos iniciales'))
  }, [])

  // Cargar niveles al cambiar carrera
  useEffect(() => {
    if (!selectedCarrera) {
      setNiveles([])
      setSelectedNivel('')
      return
    }
    api.get(`/niveles.php?carrera_id=${selectedCarrera}`)
      .then(res => {
        const nivs = res.data.data || []
        setNiveles(nivs)
        if (nivs.length > 0) setSelectedNivel(nivs[0].id)
        else setSelectedNivel('')
      })
      .catch(() => toast.error('Error al cargar niveles'))
  }, [selectedCarrera])

  // Cargar asignaturas y secciones al cambiar nivel
  useEffect(() => {
    if (!selectedNivel) {
      setAsignaturas([])
      setSecciones([])
      return
    }
    Promise.all([
      api.get(`/asignaturas.php?nivel_id=${selectedNivel}`),
      api.get(`/secciones.php?nivel_id=${selectedNivel}`),
    ]).then(([asigRes, secRes]) => {
      setAsignaturas(asigRes.data.data || [])
      setSecciones(secRes.data.data || [])
    }).catch(() => toast.error('Error al cargar asignaturas'))
  }, [selectedNivel])

  // Cargar inscripciones al cambiar tab de asignatura
  useEffect(() => {
    if (selectedAsigTab && selectedTemporada) {
      loadInscripciones(selectedAsigTab)
    }
  }, [selectedAsigTab, selectedTemporada])

  // Cargar status y conflictos
  const loadStatus = useCallback(async () => {
    if (!selectedCarrera || !selectedTemporada) return
    try {
      const [status, conf] = await Promise.all([
        getSortingStatus(selectedCarrera, selectedTemporada),
        getSortingConflicts(selectedCarrera, selectedTemporada).catch(() => []),
      ])
      setSortingStatus(status)
      setConflictos(conf)
    } catch {
      // silencioso
    }
  }, [selectedCarrera, selectedTemporada])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const loadInscripciones = async (asigId: string) => {
    try {
      const data = await getInscripciones({
        asignatura_id: asigId,
        temporada_id: selectedTemporada,
      })
      setInscripciones(data)
    } catch {
      setInscripciones([])
    }
  }

  const loadConflictos = async () => {
    if (!selectedCarrera || !selectedTemporada) return
    setLoadingConflicts(true)
    try {
      const data = await getSortingConflicts(selectedCarrera, selectedTemporada)
      setConflictos(data)
    } catch {
      toast.error('Error al cargar conflictos')
    } finally {
      setLoadingConflicts(false)
    }
  }

  const handleDataChanged = () => {
    if (selectedAsigTab) loadInscripciones(selectedAsigTab)
    loadStatus()
  }

  const asigNombre = asignaturas.find(a => a.id === selectedAsigTab)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Grupos de Estudiantes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Importe listas, asigne estudiantes a secciones y detecte conflictos horarios
        </p>
      </div>

      {/* Selectores */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Temporada</label>
          <Select value={selectedTemporada} onValueChange={setSelectedTemporada}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Temporada..." />
            </SelectTrigger>
            <SelectContent>
              {temporadas.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre} {t.activa ? '(activa)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {user?.role !== 'direccion' && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Carrera</label>
            <Select value={selectedCarrera} onValueChange={setSelectedCarrera}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Carrera..." />
              </SelectTrigger>
              <SelectContent>
                {carreras.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nivel</label>
          <Select value={selectedNivel} onValueChange={setSelectedNivel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Nivel..." />
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

      {/* Contenido principal */}
      {selectedCarrera && selectedTemporada && (
        <Tabs defaultValue="estudiantes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="estudiantes" className="gap-1.5">
              <Users className="w-4 h-4" />
              Estudiantes
            </TabsTrigger>
            <TabsTrigger value="secciones" className="gap-1.5">
              <LayoutGrid className="w-4 h-4" />
              Secciones
            </TabsTrigger>
            <TabsTrigger value="conflictos" className="gap-1.5" onClick={loadConflictos}>
              <AlertTriangle className="w-4 h-4" />
              Conflictos
              {conflictos.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {conflictos.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Estudiantes */}
          <TabsContent value="estudiantes" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setShowImport(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
              <Button variant="outline" onClick={() => setShowManual(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Agregar Manual
              </Button>
            </div>

            {/* Lista de asignaturas con conteo */}
            {asignaturas.length > 0 ? (
              <div className="space-y-2">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium">Asignatura</th>
                        <th className="text-left p-2 font-medium">Código</th>
                        <th className="text-center p-2 font-medium">Inscritos</th>
                        <th className="p-2 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {asignaturas.map(a => (
                        <AsignaturaRow
                          key={a.id}
                          asignatura={a}
                          temporadaId={selectedTemporada}
                          selected={selectedAsigTab === a.id}
                          onSelect={() => setSelectedAsigTab(a.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detalle de estudiantes de la asignatura seleccionada */}
                {selectedAsigTab && (
                  <StudentList
                    inscripciones={inscripciones}
                    asignaturaName={asigNombre ? `${asigNombre.code} - ${asigNombre.name}` : ''}
                    onChanged={handleDataChanged}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                Seleccione un nivel para ver sus asignaturas
              </p>
            )}
          </TabsContent>

          {/* Tab: Secciones */}
          <TabsContent value="secciones" className="space-y-4">
            <SortingControls
              status={sortingStatus}
              carreraId={selectedCarrera}
              temporadaId={selectedTemporada}
              nivelId={selectedNivel || undefined}
              onSorted={handleDataChanged}
            />

            {secciones.length > 0 ? (
              <SectionAssignments
                asignaturas={asignaturas}
                secciones={secciones}
                temporadaId={selectedTemporada}
                onChanged={handleDataChanged}
              />
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                Este nivel no tiene secciones. Genérelas desde el módulo de Sesiones.
              </p>
            )}
          </TabsContent>

          {/* Tab: Conflictos */}
          <TabsContent value="conflictos">
            <ConflictsList conflictos={conflictos} loading={loadingConflicts} />
          </TabsContent>
        </Tabs>
      )}

      {/* Modales */}
      <ImportExcelDialog
        open={showImport}
        onOpenChange={setShowImport}
        asignaturas={asignaturas}
        carreraId={selectedCarrera}
        nivelId={selectedNivel || undefined}
        temporadaId={selectedTemporada}
        onImported={handleDataChanged}
      />

      <ManualStudentForm
        open={showManual}
        onOpenChange={setShowManual}
        asignaturas={asignaturas}
        carreraId={selectedCarrera}
        nivelId={selectedNivel || undefined}
        temporadaId={selectedTemporada}
        onCreated={handleDataChanged}
      />
    </div>
  )
}

// Componente auxiliar para filas de asignatura con conteo lazy
function AsignaturaRow({ asignatura, temporadaId, selected, onSelect }: {
  asignatura: Asignatura
  temporadaId: string
  selected: boolean
  onSelect: () => void
}) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    getInscripciones({ asignatura_id: asignatura.id, temporada_id: temporadaId })
      .then(data => setCount(data.length))
      .catch(() => setCount(0))
  }, [asignatura.id, temporadaId])

  return (
    <tr
      className={`border-t cursor-pointer hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}
      onClick={onSelect}
    >
      <td className="p-2">{asignatura.name}</td>
      <td className="p-2 text-gray-600">{asignatura.code}</td>
      <td className="p-2 text-center">
        {count !== null ? count : '...'}
      </td>
      <td className="p-2">
        <Button variant="ghost" size="sm" className="text-xs" onClick={onSelect}>
          Ver
        </Button>
      </td>
    </tr>
  )
}
