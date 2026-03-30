import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

interface ResultData {
  version?: string
  temporada_id?: string
  resultado?: {
    score_global: number
    sesiones_asignadas: number
    sesiones_total: number
    asignaciones: Array<{
      sesion_id: string
      sala_id?: string
      bloque_id?: string
      dia_semana?: number
      docente_id?: string
      score?: number
      explicacion?: string
    }>
    no_asignadas: Array<{
      sesion_id: string
      razon: string
      sugerencias: Array<{ bloque_id: string; dia_semana: number; sala_id: string; score: number }>
    }>
    estadisticas?: {
      ocupacion_salas_promedio: number
      huecos_por_nivel_promedio: number
      cambios_edificio_nivel: number
      satisfaccion_docente_promedio: number
    }
  }
}

interface Props {
  result: unknown
  onBack: () => void
  onPush: () => void
}

export function SolverResults({ result, onBack, onPush }: Props) {
  const data = result as ResultData
  const res = data.resultado
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const [confirming, setConfirming] = useState(false)

  if (!res) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Sin datos de resultado
        </CardContent>
      </Card>
    )
  }

  const scoreColor = res.score_global >= 85 ? 'text-green-600' : res.score_global >= 70 ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = res.score_global >= 85 ? 'bg-green-50' : res.score_global >= 70 ? 'bg-yellow-50' : 'bg-red-50'

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      // Primero subir al servidor
      await onPush()
      // Luego confirmar (escribir en tabla horarios)
      // Esto requiere que el push haya creado un commit
      toast.success('Propuesta enviada a Owen para revisión')
      setConfirmOpen(false)
    } catch {
      toast.error('Error al confirmar')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold">Resultado del Solver</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPush}>
            <Upload className="w-4 h-4 mr-2" /> Enviar a Owen
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>
            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar propuesta
          </Button>
        </div>
      </div>

      {/* Score banner */}
      <Card className={scoreBg}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Score Global</p>
              <p className={`text-4xl font-bold ${scoreColor}`}>{res.score_global.toFixed(1)}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{res.sesiones_asignadas}</p>
                <p className="text-xs text-muted-foreground">Asignadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{res.sesiones_total - res.sesiones_asignadas}</p>
                <p className="text-xs text-muted-foreground">Sin asignar</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{res.sesiones_total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="asignaciones">
        <TabsList>
          <TabsTrigger value="asignaciones">
            Asignaciones ({res.asignaciones.length})
          </TabsTrigger>
          <TabsTrigger value="no_asignadas">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sin asignar ({res.no_asignadas.length})
          </TabsTrigger>
          {res.estadisticas && (
            <TabsTrigger value="stats">
              <BarChart3 className="w-3 h-3 mr-1" /> Estadísticas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="asignaciones" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sesión</TableHead>
                      <TableHead>Día</TableHead>
                      <TableHead>Sala</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Explicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.asignaciones.slice(0, 100).map((a, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{a.sesion_id.slice(0, 12)}</TableCell>
                        <TableCell>{a.dia_semana !== undefined && a.dia_semana !== null ? DIAS[a.dia_semana] || a.dia_semana : '-'}</TableCell>
                        <TableCell>{a.sala_id ? a.sala_id.slice(0, 12) : <span className="text-red-500">-</span>}</TableCell>
                        <TableCell>
                          {a.score !== undefined && a.score !== null ? (
                            <Badge variant={a.score >= 85 ? 'default' : a.score >= 70 ? 'outline' : 'destructive'}>
                              {a.score}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {a.explicacion || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {res.asignaciones.length > 100 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Mostrando 100 de {res.asignaciones.length} asignaciones
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="no_asignadas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {res.no_asignadas.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Todas las sesiones fueron asignadas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sesión</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Sugerencias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.no_asignadas.map((u, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{u.sesion_id.slice(0, 12)}</TableCell>
                        <TableCell className="text-sm text-red-600">{u.razon}</TableCell>
                        <TableCell>
                          {u.sugerencias.length > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {u.sugerencias.length} alternativa{u.sugerencias.length !== 1 ? 's' : ''}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {res.estadisticas && (
          <TabsContent value="stats" className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ocupación salas</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(res.estadisticas.ocupacion_salas_promedio * 100).toFixed(0)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Huecos/nivel</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{res.estadisticas.huecos_por_nivel_promedio.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cambios edificio</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{res.estadisticas.cambios_edificio_nivel}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Satisfacción docente</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(res.estadisticas.satisfaccion_docente_promedio * 100).toFixed(0)}%</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar propuesta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se enviarán {res.sesiones_asignadas} asignaciones a Owen como propuesta.
              Puedes revisarla en Versionado antes de publicarla.
            </p>
            <div>
              <Label>Nombre del tag (opcional)</Label>
              <Input
                value={tagName}
                onChange={e => setTagName(e.target.value)}
                placeholder="Ej: propuesta-2026-1-v1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? 'Enviando...' : 'Confirmar y enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
