import { useState, useEffect } from 'react'
import { getSystemConfig, type SystemConfig } from '../services/settingsService'
import { NotificationSettings } from '../components/NotificationSettings'
import { PublicAreaSettings } from '../components/PublicAreaSettings'
import { Bell, Globe, Loader2 } from 'lucide-react'

type Tab = 'notifications' | 'public'

export function SystemSettingsView() {
  const [config, setConfig] = useState<SystemConfig>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('notifications')

  useEffect(() => {
    getSystemConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion del Sistema</h1>
        <p className="text-sm text-muted-foreground">Notificaciones, integraciones y opciones del area publica</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setTab('notifications')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'notifications' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="h-4 w-4" /> Notificaciones
        </button>
        <button
          onClick={() => setTab('public')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'public' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="h-4 w-4" /> Area Publica
        </button>
      </div>

      {tab === 'notifications' && (
        <NotificationSettings config={config} onChange={setConfig} />
      )}

      {tab === 'public' && (
        <PublicAreaSettings config={config} onChange={setConfig} />
      )}
    </div>
  )
}
