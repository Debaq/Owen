import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowLeft, CalendarClock, GraduationCap } from 'lucide-react'
import { getDirectoresConAgenda, type Director } from '@/features/agenda/services/agendaService'
import { getPublicConfig, type SystemConfig } from '@/features/settings/services/settingsService'

export function DirectoresListView() {
  const navigate = useNavigate()
  const [directores, setDirectores] = useState<Director[]>([])
  const [loading, setLoading] = useState(true)
  const [siteConfig, setSiteConfig] = useState<SystemConfig>({})

  useEffect(() => {
    async function load() {
      try {
        const [dirs, config] = await Promise.all([
          getDirectoresConAgenda(),
          getPublicConfig().catch(() => ({}) as SystemConfig),
        ])
        setDirectores(dirs)
        setSiteConfig(config)
      } catch {
        setDirectores([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{siteConfig.site_name || 'Campus'} - Agenda de Reuniones</h1>
              <p className="text-xs text-gray-500">Agenda una reunión con un director de carrera</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Iniciar Sesión</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <CalendarClock className="h-12 w-12 mx-auto text-blue-600 mb-3" />
            <h2 className="text-2xl font-bold">Agendar Reunión</h2>
            <p className="text-gray-600 mt-2">Selecciona un director para ver su disponibilidad y agendar una cita</p>
          </div>

          {directores.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No hay directores con agenda disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {directores.map(d => (
                <Card
                  key={d.id}
                  className="p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                  onClick={() => navigate(`/agenda/${d.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{d.name}</h3>
                        {d.carrera_name && (
                          <Badge variant="secondary" className="text-xs mt-1">{d.carrera_name}</Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="outline">Ver Disponibilidad</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
