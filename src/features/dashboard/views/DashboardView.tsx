import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import {
  Building2,
  DoorOpen,
  GraduationCap,
  Users,
  Calendar,
  AlertTriangle,
  ClipboardList,
  MessageSquareWarning,
  Clock,
  ArrowRight,
  BookOpen,
  GitBranch,
  TrendingUp,
  CalendarDays,
} from 'lucide-react'
import { api } from '@/shared/lib/api'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface DashboardData {
  temporada_activa: {
    id: string
    nombre: string
    tipo: string
    fecha_inicio: string
    fecha_fin: string
  } | null
  conteos: {
    salas: number
    edificios: number
    docentes: number
    carreras: number
    asignaturas: number
    horarios_activos: number
  }
  solicitudes: {
    pendiente: number
    aprobada: number
    rechazada: number
    auto_aprobada: number
    total: number
  }
  solicitudes_recientes: Array<{
    id: string
    motivo: string
    estado: string
    fecha_inicio: string
    created_at: string
    carrera_nombre: string
    solicitante_nombre: string
  }>
  observaciones: {
    nuevo: number
    revision: number
    en_proceso: number
    resuelto: number
    cerrado: number
    total: number
  }
  horarios_recientes: Array<{
    id: string
    dia_semana: number
    tipo: string
    sala_nombre: string
    sala_codigo: string
    asignatura_nombre: string
    docente_nombre: string
    hora_inicio: string
    hora_fin: string
    created_at: string
  }>
  salas_por_tipo: Array<{ tipo: string; total: number }>
  ocupacion_hoy: {
    salas_ocupadas: number
    salas_totales: number
  }
  ultimo_commit: {
    id: string
    mensaje: string
    tipo: string
    created_at: string
    branch_nombre: string
  } | null
  branches_activos: number
  role: string
  user_name: string
  // Dirección
  mi_carrera?: string
  mis_solicitudes?: {
    pendiente: number
    aprobada: number
    rechazada: number
    auto_aprobada: number
    total: number
  }
  mi_carrera_niveles?: number
  mi_carrera_asignaturas?: number
}

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const ESTADO_SOLICITUD_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  auto_aprobada: 'bg-blue-100 text-blue-800',
}

const TIPO_SALA_LABELS: Record<string, string> = {
  aula: 'Aulas',
  laboratorio: 'Laboratorios',
  auditorio: 'Auditorios',
  taller: 'Talleres',
  sala_reuniones: 'Salas de reuniones',
  gimnasio: 'Gimnasios',
  biblioteca: 'Bibliotecas',
  otro: 'Otros',
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function DashboardView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isGestor = user?.role === 'gestor'

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/dashboard.php')
        setData(res.data)
      } catch {
        setError('No se pudo cargar el dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
            <p>{error || 'Error al cargar datos'}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ocupacionPct = data.ocupacion_hoy.salas_totales > 0
    ? Math.round((data.ocupacion_hoy.salas_ocupadas / data.ocupacion_hoy.salas_totales) * 100)
    : 0

  const obsAbiertas = data.observaciones.nuevo + data.observaciones.revision + data.observaciones.en_proceso

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Bienvenido, {data.user_name}
            {data.temporada_activa && (
              <span> — {data.temporada_activa.nombre}</span>
            )}
          </p>
        </div>
        {data.temporada_activa && (
          <Badge variant="outline" className="self-start sm:self-auto">
            <CalendarDays className="h-3 w-3 mr-1" />
            {formatDate(data.temporada_activa.fecha_inicio)} — {formatDate(data.temporada_activa.fecha_fin)}
          </Badge>
        )}
      </div>

      {/* Alertas urgentes */}
      {isGestor && (data.solicitudes.pendiente > 0 || obsAbiertas > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {data.solicitudes.pendiente > 0 && (
            <button
              onClick={() => navigate('/admin/requests')}
              className="flex items-center gap-3 flex-1 p-4 rounded-xl border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <p className="font-semibold text-yellow-900">
                  {data.solicitudes.pendiente} solicitud{data.solicitudes.pendiente !== 1 ? 'es' : ''} pendiente{data.solicitudes.pendiente !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-yellow-700">Requieren revisión</p>
              </div>
              <ArrowRight className="h-4 w-4 text-yellow-600 ml-auto" />
            </button>
          )}
          {obsAbiertas > 0 && (
            <button
              onClick={() => navigate('/admin/observations')}
              className="flex items-center gap-3 flex-1 p-4 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center shrink-0">
                <MessageSquareWarning className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="font-semibold text-orange-900">
                  {obsAbiertas} observacion{obsAbiertas !== 1 ? 'es' : ''} abierta{obsAbiertas !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-orange-700">
                  {data.observaciones.nuevo} nueva{data.observaciones.nuevo !== 1 ? 's' : ''},
                  {' '}{data.observaciones.en_proceso} en proceso
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-orange-600 ml-auto" />
            </button>
          )}
        </div>
      )}

      {/* Dirección: alerta de sus solicitudes */}
      {!isGestor && data.mis_solicitudes && data.mis_solicitudes.pendiente > 0 && (
        <button
          onClick={() => navigate('/admin/requests')}
          className="flex items-center gap-3 w-full p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">
              {data.mis_solicitudes.pendiente} solicitud{data.mis_solicitudes.pendiente !== 1 ? 'es' : ''} en espera
            </p>
            <p className="text-sm text-blue-700">Pendientes de aprobación por el gestor</p>
          </div>
          <ArrowRight className="h-4 w-4 text-blue-600 ml-auto" />
        </button>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Salas"
          value={data.conteos.salas}
          icon={<DoorOpen className="h-4 w-4" />}
          onClick={() => navigate('/admin/rooms')}
        />
        <StatCard
          label="Edificios"
          value={data.conteos.edificios}
          icon={<Building2 className="h-4 w-4" />}
          onClick={isGestor ? () => navigate('/admin/buildings') : undefined}
        />
        <StatCard
          label="Docentes"
          value={data.conteos.docentes}
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate('/admin/academic/docentes')}
        />
        <StatCard
          label="Carreras"
          value={data.conteos.carreras}
          icon={<GraduationCap className="h-4 w-4" />}
          onClick={() => navigate('/admin/academic/carreras')}
        />
        <StatCard
          label="Asignaturas"
          value={data.conteos.asignaturas}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Horarios"
          value={data.conteos.horarios_activos}
          icon={<Calendar className="h-4 w-4" />}
          onClick={() => navigate('/admin/schedules')}
        />
      </div>

      {/* Fila principal: 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ocupación hoy + Salas por tipo */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ocupación de hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-3xl font-bold">{ocupacionPct}%</span>
                <span className="text-sm text-muted-foreground mb-1">
                  {data.ocupacion_hoy.salas_ocupadas} de {data.ocupacion_hoy.salas_totales} salas
                </span>
              </div>
              <Progress value={ocupacionPct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Salas con al menos un bloque asignado hoy ({DIAS[new Date().getDay() === 0 ? 7 : new Date().getDay()]})
              </p>
            </CardContent>
          </Card>

          {data.salas_por_tipo.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Salas por tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.salas_por_tipo.map((s) => (
                    <div key={s.tipo} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{TIPO_SALA_LABELS[s.tipo] || s.tipo}</span>
                      <span className="font-medium">{s.total}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Versionado (solo gestor) */}
          {isGestor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Versionado de horarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.ultimo_commit ? (
                  <div className="text-sm">
                    <p className="font-medium">{data.ultimo_commit.mensaje}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {data.ultimo_commit.branch_nombre} — {data.ultimo_commit.tipo} — {formatDateTime(data.ultimo_commit.created_at)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin commits aún</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Branches en borrador/revisión</span>
                  <Badge variant="secondary">{data.branches_activos}</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/admin/versioning')}>
                  Ver versionado
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Solicitudes recientes + Horarios recientes */}
        <div className="space-y-6">
          {/* Solicitudes */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Solicitudes recientes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/requests')}>
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.solicitudes_recientes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin solicitudes</p>
              ) : (
                <div className="space-y-3">
                  {data.solicitudes_recientes.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.motivo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.solicitante_nombre} — {s.carrera_nombre}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_SOLICITUD_COLORS[s.estado] || 'bg-gray-100 text-gray-800'}`}>
                          {s.estado.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(s.fecha_inicio)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumen de estados */}
              {data.solicitudes.total > 0 && (
                <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
                  {data.solicitudes.pendiente > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      {data.solicitudes.pendiente} pendiente{data.solicitudes.pendiente !== 1 ? 's' : ''}
                    </span>
                  )}
                  {data.solicitudes.aprobada > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      {data.solicitudes.aprobada} aprobada{data.solicitudes.aprobada !== 1 ? 's' : ''}
                    </span>
                  )}
                  {data.solicitudes.auto_aprobada > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {data.solicitudes.auto_aprobada} auto
                    </span>
                  )}
                  {data.solicitudes.rechazada > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                      {data.solicitudes.rechazada} rechazada{data.solicitudes.rechazada !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Horarios recientes */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Últimos horarios creados
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/schedules')}>
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.horarios_recientes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin horarios registrados</p>
              ) : (
                <div className="space-y-3">
                  {data.horarios_recientes.map((h) => (
                    <div key={h.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{h.asignatura_nombre || 'Sin asignatura'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {h.docente_nombre} — {h.sala_codigo || h.sala_nombre}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-xs font-medium">{DIAS[h.dia_semana]}</span>
                        <span className="text-xs text-muted-foreground">
                          {h.hora_inicio?.slice(0, 5)}–{h.hora_fin?.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info de carrera (dirección) */}
          {!isGestor && data.mi_carrera && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Mi carrera
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{data.mi_carrera}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{data.mi_carrera_niveles}</p>
                    <p className="text-xs text-muted-foreground">Niveles</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{data.mi_carrera_asignaturas}</p>
                    <p className="text-xs text-muted-foreground">Asignaturas</p>
                  </div>
                </div>
                {data.mis_solicitudes && data.mis_solicitudes.total > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Mis solicitudes</p>
                    <div className="flex flex-wrap gap-2">
                      {data.mis_solicitudes.pendiente > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          {data.mis_solicitudes.pendiente} pendiente{data.mis_solicitudes.pendiente !== 1 ? 's' : ''}
                        </span>
                      )}
                      {data.mis_solicitudes.aprobada + data.mis_solicitudes.auto_aprobada > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          {data.mis_solicitudes.aprobada + data.mis_solicitudes.auto_aprobada} aprobada{(data.mis_solicitudes.aprobada + data.mis_solicitudes.auto_aprobada) !== 1 ? 's' : ''}
                        </span>
                      )}
                      {data.mis_solicitudes.rechazada > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          {data.mis_solicitudes.rechazada} rechazada{data.mis_solicitudes.rechazada !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/schedules')}>
              <Calendar className="h-3.5 w-3.5 mr-1.5" /> Horarios
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/rooms')}>
              <DoorOpen className="h-3.5 w-3.5 mr-1.5" /> Salas
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/requests')}>
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Solicitudes
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/map')}>
              <Building2 className="h-3.5 w-3.5 mr-1.5" /> Mapa
            </Button>
            {isGestor && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/schedule-wizard')}>
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Asistente de horarios
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/solver')}>
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Solver
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/reports')}>
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Reportes
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon, onClick }: {
  label: string
  value: number
  icon: React.ReactNode
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
      <Wrapper onClick={onClick} className="p-4 w-full text-left">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </Wrapper>
    </Card>
  )
}
