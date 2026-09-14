import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import type { SystemConfig } from '../services/settingsService'
import { saveSystemConfig } from '../services/settingsService'
import { api } from '@/shared/lib/api'
import { Save, Cpu, Map, Database, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  config: SystemConfig
  onChange: (config: SystemConfig) => void
}

export function GeneralSettings({ config, onChange }: Props) {
  const [local, setLocal] = useState({
    site_name: config.site_name || 'Sistema OWEN',
    site_subtitle: config.site_subtitle || 'Sistema de Horarios - Sede Puerto Montt',
    site_footer: config.site_footer || 'Sistema OWEN - Sede Puerto Montt, Chile',
  })
  const [saving, setSaving] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrateResults, setMigrateResults] = useState<string[] | null>(null)
  const [migrateApplied, setMigrateApplied] = useState(0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSystemConfig(local)
      onChange({ ...config, ...local })
      toast.success('Configuracion guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identidad del Sitio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Nombre del sistema</Label>
          <Input
            value={local.site_name}
            onChange={e => setLocal(s => ({ ...s, site_name: e.target.value }))}
            placeholder="Ej: Sistema OWEN"
          />
          <p className="text-xs text-muted-foreground">Se muestra en el header de la pagina publica</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Subtitulo</Label>
          <Input
            value={local.site_subtitle}
            onChange={e => setLocal(s => ({ ...s, site_subtitle: e.target.value }))}
            placeholder="Ej: Sistema de Horarios - Sede Puerto Montt"
          />
          <p className="text-xs text-muted-foreground">Se muestra debajo del nombre</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Texto del pie de pagina</Label>
          <Input
            value={local.site_footer}
            onChange={e => setLocal(s => ({ ...s, site_footer: e.target.value }))}
            placeholder="Ej: Sistema OWEN - Sede Puerto Montt, Chile"
          />
          <p className="text-xs text-muted-foreground">Se muestra en el footer de todas las paginas publicas</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardContent>

      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Map className="h-4 w-4" /> Mapa y Navegación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
          <p className="font-semibold">Trazado automático de rutas peatonales</p>
          <p>
            Al dibujar rutas en el mapa del campus, el modo «Automático» traza el camino peatonal real
            usando datos de OpenStreetMap. Para esto necesitas una API key gratuita de OpenRouteService.
          </p>
          <p className="font-medium">Cómo obtenerla:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Entra a{' '}
              <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium">
                openrouteservice.org/dev/#/signup
              </a>
              {' '}y crea una cuenta gratuita
            </li>
            <li>En tu dashboard, crea un token/API key</li>
            <li>Copia la key y pégala en el campo de abajo</li>
          </ol>
          <p className="text-xs text-blue-700">
            Plan gratuito: 2000 consultas/día. Solo se consume al crear rutas (el gestor), nunca en la navegación pública.
            Sin esta key, el modo automático no funcionará pero puedes seguir dibujando rutas manualmente.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">API Key de OpenRouteService</Label>
          <Input
            type="password"
            value={config.ors_api_key || ''}
            onChange={e => {
              onChange({ ...config, ors_api_key: e.target.value })
            }}
            placeholder="Pega aquí tu API key"
          />
        </div>
        <Button
          onClick={async () => {
            setSaving(true)
            try {
              await saveSystemConfig({ ors_api_key: config.ors_api_key || '' })
              toast.success('API key guardada')
            } catch {
              toast.error('Error al guardar')
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          variant="outline"
        >
          <Save className="h-4 w-4 mr-2" />
          Guardar API Key
        </Button>
      </CardContent>

      <CardHeader>
        <CardTitle className="text-base">Módulos del Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">Generador de Horarios (Solver)</Label>
              <p className="text-xs text-muted-foreground">
                Habilita el asistente de horarios, generación automática, sesiones, bloqueos y versionado
              </p>
            </div>
          </div>
          <Switch
            checked={config.solver_enabled === '1'}
            onCheckedChange={async (checked) => {
              const val = checked ? '1' : '0'
              try {
                await saveSystemConfig({ solver_enabled: val })
                onChange({ ...config, solver_enabled: val })
                toast.success(checked ? 'Solver habilitado' : 'Solver deshabilitado')
              } catch {
                toast.error('Error al cambiar configuración')
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Los cambios en los módulos se reflejan en el menú lateral al recargar la página.
        </p>
      </CardContent>

      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" /> Base de Datos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ejecuta las migraciones para actualizar la estructura de la base de datos.
          Es seguro ejecutarlo múltiples veces — solo aplica cambios pendientes.
        </p>
        <Button
          onClick={async () => {
            setMigrating(true)
            setMigrateResults(null)
            setMigrateApplied(0)
            try {
              const res = await api.post('/migrate.php')
              const applied = res.data.applied || 0
              setMigrateResults(res.data.data || [])
              setMigrateApplied(applied)
              if (applied > 0) {
                toast.success(res.data.message || 'Migración completada')
              } else {
                toast.info(res.data.message || 'Base de datos al día')
              }
            } catch (err: any) {
              toast.error(err.response?.data?.error || 'Error al ejecutar migración')
            } finally {
              setMigrating(false)
            }
          }}
          disabled={migrating}
          variant="outline"
        >
          <Database className="h-4 w-4 mr-2" />
          {migrating ? 'Ejecutando...' : 'Ejecutar Migraciones'}
        </Button>

        {migrateResults && (
          <div className="rounded-lg border bg-gray-50 p-3 max-h-60 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              <CheckCircle2 className={`h-3.5 w-3.5 inline mr-1 ${migrateApplied > 0 ? 'text-green-600' : 'text-gray-400'}`} />
              {migrateApplied > 0
                ? `${migrateApplied} cambios aplicados`
                : 'Sin cambios pendientes — base de datos al día'}
            </p>
            <div className="space-y-0.5">
              {migrateResults.map((line, i) => (
                <p key={i} className={`text-xs font-mono ${
                  line.startsWith('[+]') ? 'text-green-700' :
                  line.startsWith('[!]') ? 'text-amber-700' :
                  'text-gray-500'
                }`}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
