import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import type { SystemConfig } from '../services/settingsService'
import { saveSystemConfig, uploadImage } from '../services/settingsService'
import { Save, Upload, X, QrCode } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  config: SystemConfig
  onChange: (config: SystemConfig) => void
}

export function QRPrintSettings({ config, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState({
    qr_logo_url: config.qr_logo_url || '',
    qr_show_building: config.qr_show_building ?? '1',
    qr_show_room_name: config.qr_show_room_name ?? '1',
    qr_show_instruction: config.qr_show_instruction ?? '1',
    qr_instruction_text: config.qr_instruction_text || 'Escanea para ver horario y reportar',
    qr_show_room_type: config.qr_show_room_type ?? '0',
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadImage(file)
      setLocal(s => ({ ...s, qr_logo_url: url }))
      toast.success('Logo subido correctamente')
    } catch {
      toast.error('Error al subir el logo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSystemConfig(local)
      onChange({ ...config, ...local })
      toast.success('Configuraci\u00f3n de QR guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Logo institucional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Se muestra en la parte superior de cada hoja impresa. Recomendado: PNG transparente, m\u00e1ximo 300x100px.
          </p>

          {local.qr_logo_url ? (
            <div className="flex items-center gap-4">
              <div className="border rounded-lg p-3 bg-gray-50">
                <img
                  src={local.qr_logo_url}
                  alt="Logo"
                  className="max-h-16 max-w-[200px] object-contain"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocal(s => ({ ...s, qr_logo_url: '' }))}
              >
                <X className="h-3 w-3 mr-1" /> Quitar
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <QrCode className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Sin logo configurado</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-3 w-3 mr-1" />
                {uploading ? 'Subiendo...' : 'Subir logo'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          )}

          {local.qr_logo_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3 w-3 mr-1" />
              {uploading ? 'Subiendo...' : 'Cambiar logo'}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </CardContent>
      </Card>

      {/* Opciones de contenido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Contenido de cada QR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Mostrar en cada tarjeta</Label>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Edificio y piso</p>
                <p className="text-xs text-muted-foreground">Ej: "Edificio Central — Piso 4"</p>
              </div>
              <Switch
                checked={local.qr_show_building === '1'}
                onCheckedChange={v => setLocal(s => ({ ...s, qr_show_building: v ? '1' : '0' }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Nombre descriptivo</p>
                <p className="text-xs text-muted-foreground">Ej: "Aula Magna Norte"</p>
              </div>
              <Switch
                checked={local.qr_show_room_name === '1'}
                onCheckedChange={v => setLocal(s => ({ ...s, qr_show_room_name: v ? '1' : '0' }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Tipo de sala</p>
                <p className="text-xs text-muted-foreground">Ej: "Laboratorio", "Auditorio"</p>
              </div>
              <Switch
                checked={local.qr_show_room_type === '1'}
                onCheckedChange={v => setLocal(s => ({ ...s, qr_show_room_type: v ? '1' : '0' }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Texto de instrucci\u00f3n</p>
                <p className="text-xs text-muted-foreground">Texto debajo del QR</p>
              </div>
              <Switch
                checked={local.qr_show_instruction === '1'}
                onCheckedChange={v => setLocal(s => ({ ...s, qr_show_instruction: v ? '1' : '0' }))}
              />
            </div>

            {local.qr_show_instruction === '1' && (
              <div className="space-y-1.5 pl-4 border-l-2">
                <Label className="text-sm">Texto personalizado</Label>
                <Input
                  value={local.qr_instruction_text}
                  onChange={e => setLocal(s => ({ ...s, qr_instruction_text: e.target.value }))}
                  placeholder="Escanea para ver horario y reportar"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Guardando...' : 'Guardar configuraci\u00f3n QR'}
      </Button>
    </div>
  )
}
