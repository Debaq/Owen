import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { SystemConfig } from '../services/settingsService'
import { saveSystemConfig } from '../services/settingsService'
import { Building2, MessageSquare, HelpCircle, Navigation } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  config: SystemConfig
  onChange: (config: SystemConfig) => void
}

interface ToggleRowProps {
  label: string
  description: string
  icon: React.ReactNode
  enabled: boolean
  onToggle: () => void
}

function ToggleRow({ label, description, icon, enabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export function PublicAreaSettings({ config, onChange }: Props) {
  const save = async (key: string, value: string) => {
    const newConfig = { ...config, [key]: value }
    try {
      await saveSystemConfig({ [key]: value })
      onChange(newConfig)
      toast.success('Guardado')
    } catch {
      toast.error('Error al guardar')
    }
  }

  const features = [
    {
      key: 'public_building_view_enabled',
      label: 'Vista de Edificio',
      description: 'Pagina publica con estado actual de las salas por edificio (para aseo/soporte)',
      icon: <Building2 className="h-4 w-4 text-blue-600" />,
    },
    {
      key: 'public_help_requests_enabled',
      label: 'Pedidos de Ayuda',
      description: 'Boton "Necesito Ayuda" en la vista publica de salas',
      icon: <HelpCircle className="h-4 w-4 text-red-600" />,
    },
    {
      key: 'public_comments_enabled',
      label: 'Comentarios',
      description: 'Formulario de comentarios y observaciones en la vista publica de salas',
      icon: <MessageSquare className="h-4 w-4 text-green-600" />,
    },
    {
      key: 'public_navigation_enabled',
      label: 'Navegacion entre Salas',
      description: 'Funcion "Como llegar" con ruta a pie entre salas',
      icon: <Navigation className="h-4 w-4 text-purple-600" />,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funciones del Area Publica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {features.map(f => (
            <ToggleRow
              key={f.key}
              label={f.label}
              description={f.description}
              icon={f.icon}
              enabled={config[f.key] === '1'}
              onToggle={() => save(f.key, config[f.key] === '1' ? '0' : '1')}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
