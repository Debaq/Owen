import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import type { SystemConfig } from '../services/settingsService'
import { saveSystemConfig } from '../services/settingsService'
import { Save, Cpu } from 'lucide-react'
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
    </Card>
  )
}
