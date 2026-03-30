import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Zap, Trash2, Users, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog'
import { getSessions, generateSessions, deleteSession, getSections, generateSections, deleteSection } from '../services/sessionService'
import type { Sesion, Seccion, Carrera, Nivel, Asignatura } from '@/shared/types'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

interface Temporada { id: string; nombre: string; activa: boolean }

export function SessionGeneratorView() {
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])

  const [selectedTemporada, setSelectedTemporada] = useState('')
  const [selectedCarrera, setSelectedCarrera] = useState('')
  const [selectedNivel, setSelectedNivel] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<Temporada[]>>('/temporadas.php'),
      api.get<ApiResponse<Carrera[]>>('/carreras.php'),
    ]).then(([tRes, cRes]) => {
      const temps = tRes.data.data || []
      setTemporadas(temps)
      const activa = temps.find((t: Temporada) => t.activa)
      if (activa) setSelectedTemporada(activa.id)
      setCarreras(cRes.data.data || [])
    })
  }, [])

  useEffect(() => {
    if (selectedCarrera) {
      api.get<ApiResponse<Nivel[]>>(`/niveles.php?carrera_id=${selectedCarrera}`)
        .then((res: { data: ApiResponse<Nivel[]> }) => { setNiveles(res.data.data || []); setSelectedNivel('') })
    } else { setNiveles([]); setSelectedNivel('') }
  }, [selectedCarrera])

  useEffect(() => {
    if (selectedNivel) {
      Promise.all([
        api.get<ApiResponse<Asignatura[]>>(`/asignaturas.php?nivel_id=${selectedNivel}`),
        getSections(selectedNivel),
        getSessions({ nivel_id: selectedNivel, temporada_id: selectedTemporada || undefined }),
      ]).then(([aRes, secs, sess]) => {
        setAsignaturas(aRes.data.data || [])
        setSecciones(secs)
        setSesiones(sess)
      })
    } else {
      setAsignaturas([]); setSecciones([]); setSesiones([])
    }
  }, [selectedNivel, selectedTemporada])

  const handleGenerateSections = async () => {
    if (!selectedNivel) return
    setLoading(true)
    try {
      const result = await generateSections(selectedNivel)
      toast.success(`${result.secciones.length} secciones generadas (lab: ${result.lab_capacidad_usada} alumnos)`)
      setSecciones(await getSections(selectedNivel))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al generar secciones')
    } finally { setLoading(false) }
  }

  const handleDeleteSection = async (id: string) => {
    try {
      await deleteSection(id)
      toast.success('Sección eliminada')
      setSecciones(await getSections(selectedNivel))
    } catch (error: any) { toast.error(error.response?.data?.error || 'Error') }
  }

  const handleGenerateSessions = async (asignaturaId: string) => {
    setLoading(true)
    try {
      const result = await generateSessions(asignaturaId, selectedTemporada || undefined)
      toast.success(`${result.sesiones.length} sesiones generadas (${result.total_teoricas} teóricas, ${result.total_practicas} prácticas)`)
      setSesiones(await getSessions({ nivel_id: selectedNivel, temporada_id: selectedTemporada || undefined }))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al generar sesiones')
    } finally { setLoading(false) }
  }

  const handleGenerateAll = async () => {
    setLoading(true)
    let total = 0
    for (const asig of asignaturas) {
      try {
        const result = await generateSessions(asig.id, selectedTemporada || undefined)
        total += result.sesiones.length
      } catch { /* continuar con las demás */ }
    }
    toast.success(`${total} sesiones generadas para ${asignaturas.length} asignaturas`)
    setSesiones(await getSessions({ nivel_id: selectedNivel, temporada_id: selectedTemporada || undefined }))
    setLoading(false)
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id)
      setSesiones(prev => prev.filter(s => s.id !== id))
    } catch (error: any) { toast.error(error.response?.data?.error || 'Error') }
  }

  const nivel = niveles.find(n => n.id === selectedNivel)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generador de Sesiones</h1>
        <p className="text-muted-foreground">
          Genera sesiones teóricas y prácticas automáticamente para cada asignatura.
        </p>
      </div>

      {/* Selectores */}
      <div className="flex gap-4">
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Temporada</label>
          <Select value={selectedTemporada} onValueChange={setSelectedTemporada}>
            <SelectTrigger><SelectValue placeholder="Temporada" /></SelectTrigger>
            <SelectContent>
              {temporadas.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Carrera</label>
          <Select value={selectedCarrera} onValueChange={setSelectedCarrera}>
            <SelectTrigger><SelectValue placeholder="Seleccionar carrera" /></SelectTrigger>
            <SelectContent>
              {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Nivel</label>
          <Select value={selectedNivel} onValueChange={setSelectedNivel} disabled={!selectedCarrera}>
            <SelectTrigger><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
            <SelectContent>
              {niveles.map(n => <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedNivel && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Secciones */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" /> Secciones
                {nivel && <Badge variant="outline">{nivel.alumnos_estimados || 0} alumnos</Badge>}
              </CardTitle>
              <Button size="sm" onClick={handleGenerateSections} disabled={loading}>
                <Zap className="w-4 h-4 mr-1" /> Auto-generar
              </Button>
            </CardHeader>
            <CardContent>
              {secciones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin secciones. Haz clic en "Auto-generar" para crear secciones basadas en la capacidad de los laboratorios.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sección</TableHead>
                      <TableHead className="text-right">Alumnos</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secciones.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">Sección {s.nombre}</TableCell>
                        <TableCell className="text-right">{s.alumnos}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(s.id)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Asignaturas con generación de sesiones */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Asignaturas
                <Badge variant="outline">{asignaturas.length}</Badge>
              </CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={loading || asignaturas.length === 0}>
                    <Zap className="w-4 h-4 mr-1" /> Generar todas
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generar sesiones para todas las asignaturas</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se generarán sesiones para las {asignaturas.length} asignaturas del nivel.
                      Las sesiones existentes serán reemplazadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateAll}>Generar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asignatura</TableHead>
                    <TableHead className="text-center">T</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center">Sesiones</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asignaturas.map(a => {
                    const count = sesiones.filter(s => s.asignatura_id === a.id).length
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.code}</div>
                        </TableCell>
                        <TableCell className="text-center">{a.horas_teoria}</TableCell>
                        <TableCell className="text-center">{a.horas_practica}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={count > 0 ? 'default' : 'outline'}>{count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleGenerateSessions(a.id)} disabled={loading}>
                            <Zap className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de sesiones generadas */}
      {sesiones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Sesiones Generadas
              <Badge variant="outline" className="ml-2">{sesiones.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Asignatura</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Docente</TableHead>
                  <TableHead className="text-right">Alumnos</TableHead>
                  <TableHead className="text-right">Bloques</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sesiones.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.etiqueta || '-'}</TableCell>
                    <TableCell className="text-sm">{s.asignatura_code}</TableCell>
                    <TableCell>
                      <Badge variant={s.tipo === 'teorica' ? 'default' : 'secondary'}>
                        {s.tipo === 'teorica' ? 'Teórica' : 'Práctica'}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.seccion_nombre || '-'}</TableCell>
                    <TableCell className="text-sm">{s.docente_nombre || '-'}</TableCell>
                    <TableCell className="text-right">{s.alumnos_estimados}</TableCell>
                    <TableCell className="text-right">{s.bloques_requeridos}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSession(s.id)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
