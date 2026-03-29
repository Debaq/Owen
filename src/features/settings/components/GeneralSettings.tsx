import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import type { SystemConfig } from '../services/settingsService'
import { saveSystemConfig } from '../services/settingsService'
import { Save } from 'lucide-react'
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
    </Card>
  )
}
