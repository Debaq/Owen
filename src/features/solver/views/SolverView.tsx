import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Cpu, Play, Square, Upload, Download, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { Progress } from '@/shared/components/ui/progress'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { useSolverConnection } from '../hooks/useSolverConnection'
import { solverLocalService, type SolverProgress } from '../services/solverLocalService'
import { SolverResults } from '../components/SolverResults'
import { OfflineImport } from '../components/OfflineImport'
import { api } from '@/shared/lib/api'
import type { ApiResponse } from '@/shared/types'

interface Temporada { id: string; nombre: string; activa: boolean }

const PRESETS: Record<string, Record<string, number>> = {
  equilibrado: {
    disponibilidad_docente: 1000,
    distancia_edificios: 800,
    calidad_pedagogica: 500,
    eficiencia_sala: 150,
  },
  priorizar_alumnos: {
    disponibilidad_docente: 500,
    distancia_edificios: 1200,
    calidad_pedagogica: 800,
    eficiencia_sala: 200,
  },
  priorizar_docentes: {
    disponibilidad_docente: 1500,
    distancia_edificios: 600,
    calidad_pedagogica: 300,
    eficiencia_sala: 100,
  },
}

export function SolverView() {
  const { connected, running, version, refresh } = useSolverConnection(5000)

  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [selectedTemporada, setSelectedTemporada] = useState('')
  const [tiempoMax, setTiempoMax] = useState(30)
  const [pesos, setPesos] = useState(PRESETS.equilibrado)
  const [token, setToken] = useState('')
  const [progress, setProgress] = useState<SolverProgress | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [showResults, setShowResults] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get<ApiResponse<Temporada[]>>('/temporadas.php').then(res => {
      const temps = res.data.data || []
      setTemporadas(temps)
      const activa = temps.find((t: Temporada) => t.activa)
      if (activa) setSelectedTemporada(activa.id)
    })
    // Cargar token guardado
    const saved = localStorage.getItem('owen_solver_token')
    if (saved) setToken(saved)
  }, [])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleSetPreset = (name: string) => {
    if (PRESETS[name]) setPesos(PRESETS[name])
  }

  const handleRun = async () => {
    if (!token) { toast.error('Ingresa un token API del solver'); return }
    if (!selectedTemporada) { toast.error('Selecciona una temporada'); return }

    localStorage.setItem('owen_solver_token', token)

    try {
      const serverUrl = api.defaults.baseURL || ''
      await solverLocalService.run({
        server_url: serverUrl,
        token,
        temporada_id: selectedTemporada,
        config: { tiempo_max_seg: tiempoMax, pesos },
      })
      toast.success('Solver iniciado')
      refresh()
      startPolling()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al iniciar solver'
      toast.error(msg)
    }
  }

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const prog = await solverLocalService.getProgress()
        setProgress(prog)
        if (prog.phase === 'done' || prog.phase === 'error' || prog.phase === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          refresh()
          if (prog.phase === 'done') {
            const res = await solverLocalService.getResult()
            setResult(res)
            setShowResults(true)
            toast.success(prog.message)
          } else if (prog.phase === 'error') {
            toast.error(prog.message)
          }
        }
      } catch { /* ignore */ }
    }, 1000)
  }

  const handleCancel = async () => {
    await solverLocalService.cancel()
    if (pollRef.current) clearInterval(pollRef.current)
    setProgress(null)
    refresh()
    toast.info('Solver cancelado')
  }

  const handlePush = async () => {
    try {
      await solverLocalService.push()
      toast.success('Resultado enviado a Owen')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al enviar'
      toast.error(msg)
    }
  }

  const handleExportOffline = () => {
    if (!selectedTemporada || !token) {
      toast.error('Selecciona temporada e ingresa token')
      return
    }
    const url = `${api.defaults.baseURL}/solver-export.php?temporada_id=${selectedTemporada}`
    window.open(url, '_blank')
  }

  const phaseLabels: Record<string, string> = {
    starting: 'Iniciando',
    downloading: 'Descargando datos',
    preprocessing: 'Preprocesando',
    solving: 'Resolviendo',
    greedy: 'Solución inicial',
    annealing: 'Optimizando (SA)',
    room_assignment: 'Asignando salas',
    verifying: 'Verificando',
    done: 'Completado',
    error: 'Error',
    cancelled: 'Cancelado',
  }

  if (showResults && result) {
    return (
      <div className="p-6">
        <SolverResults
          result={result}
          onBack={() => setShowResults(false)}
          onPush={handlePush}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="w-6 h-6" /> Solver de Horarios
          </h1>
          <p className="text-muted-foreground">
            Genera horarios automáticamente usando Simulated Annealing + asignación ILP de salas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'outline'} className={connected ? 'bg-green-100 text-green-700' : ''}>
            {connected ? `Solver v${version}` : 'Solver offline'}
          </Badge>
        </div>
      </div>

      {!connected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Solver no detectado</p>
              <p className="text-sm text-yellow-600">
                Descarga e inicia Owen Solver en tu máquina. El solver escucha en localhost:9377.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuración */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Temporada</Label>
                <Select value={selectedTemporada} onValueChange={setSelectedTemporada}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {temporadas.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nombre}{t.activa ? ' (activa)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tiempo máximo (segundos)</Label>
                <Input type="number" min={5} max={300} value={tiempoMax} onChange={e => setTiempoMax(parseInt(e.target.value) || 30)} />
              </div>
            </div>

            <div>
              <Label>Token API</Label>
              <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Token generado en Configuración → Tokens" />
              <p className="text-xs text-muted-foreground mt-1">Genera un token en Configuración del sistema</p>
            </div>

            <div>
              <Label className="mb-2 block">Presets de pesos</Label>
              <div className="flex gap-2">
                {Object.keys(PRESETS).map(name => (
                  <Button key={name} variant="outline" size="sm" onClick={() => handleSetPreset(name)} className="capitalize">
                    {name.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(pesos).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="text-xs w-40 truncate capitalize">{key.replace(/_/g, ' ')}</Label>
                  <Input
                    type="number" min={0} max={2000} value={value}
                    onChange={e => setPesos(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                    className="w-20 h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle>Ejecutar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full" size="lg"
              onClick={handleRun}
              disabled={!connected || running || !selectedTemporada || !token}
            >
              <Play className="w-4 h-4 mr-2" /> Generar Horarios
            </Button>

            {running && (
              <Button variant="destructive" className="w-full" onClick={handleCancel}>
                <Square className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            )}

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Modo offline</p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleExportOffline}>
                <Download className="w-4 h-4 mr-2" /> Exportar datos
              </Button>
              <OfflineImport onImported={() => toast.success('Resultado importado — revísalo en Versionado')} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso */}
      {progress && progress.phase !== 'done' && progress.phase !== 'error' && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{phaseLabels[progress.phase] || progress.phase}</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress.progress * 100)}%
                </span>
              </div>
              <Progress value={progress.progress * 100} />
              <p className="text-sm text-muted-foreground">{progress.message}</p>
              <div className="flex items-center gap-4 text-sm">
                {progress.sessions_assigned !== null && progress.sessions_total !== null && (
                  <span>{progress.sessions_assigned}/{progress.sessions_total} sesiones</span>
                )}
                {progress.score !== null && (
                  <Badge variant="outline">Score: {progress.score.toFixed(1)}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
