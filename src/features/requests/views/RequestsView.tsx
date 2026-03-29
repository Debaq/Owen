import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SolicitudForm } from '../components/SolicitudForm'
import { SolicitudList } from '../components/SolicitudList'
import { SolicitudDetail } from '../components/SolicitudDetail'
import { MatchResults } from '../components/MatchResults'
import {
  getAllSolicitudes,
  autoProcessSolicitud,
} from '../services/solicitudService'
import type { SolicitudWithDetails, SolicitudFormData, MatchResponse } from '../services/solicitudService'

export function RequestsView() {
  const { user } = useAuth()
  const isGestor = user?.role === 'gestor'

  const [solicitudes, setSolicitudes] = useState<SolicitudWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('todas')

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudWithDetails | null>(null)

  // Resultados post-submit
  const [lastResult, setLastResult] = useState<{
    solicitud: SolicitudWithDetails
    matchResults: MatchResponse
  } | null>(null)

  const loadSolicitudes = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getAllSolicitudes()
      setSolicitudes(data)
    } catch (err) {
      toast.error('Error al cargar solicitudes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSolicitudes()
  }, [loadSolicitudes])

  const handleSubmit = async (formData: SolicitudFormData) => {
    setIsSubmitting(true)
    try {
      const result = await autoProcessSolicitud(formData)
      setShowCreateForm(false)
      setLastResult({
        solicitud: result.solicitud,
        matchResults: result.match_results,
      })

      if (result.solicitud.estado === 'auto_aprobada') {
        toast.success('Solicitud auto-aprobada. Sala asignada automáticamente.')
      } else {
        toast.info('Solicitud creada. Será revisada por un gestor.')
      }

      loadSolicitudes()
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al crear la solicitud'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDetail = (sol: SolicitudWithDetails) => {
    setSelectedSolicitud(sol)
  }

  const handleDetailUpdated = () => {
    setSelectedSolicitud(null)
    loadSolicitudes()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isGestor ? 'Gestión de Solicitudes' : 'Solicitudes de Salas'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isGestor
              ? 'Revisa, aprueba o rechaza solicitudes de sala'
              : 'Solicita salas para tus clases y eventos'
            }
          </p>
        </div>
        <Button onClick={() => { setShowCreateForm(true); setLastResult(null) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Resultado del último envío */}
      {lastResult && (
        <div className="mb-6 border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Resultado de tu solicitud</h3>
            <Button variant="ghost" size="sm" onClick={() => setLastResult(null)}>Cerrar</Button>
          </div>
          <MatchResults
            matches={lastResult.matchResults.matches}
            confianza={lastResult.matchResults.confianza}
            autoAprobable={lastResult.matchResults.auto_aprobable}
            totalCandidates={lastResult.matchResults.total_candidates}
            availableCount={lastResult.matchResults.available_count}
          />
        </div>
      )}

      {/* Lista */}
      <SolicitudList
        solicitudes={solicitudes}
        onViewDetail={handleViewDetail}
        filterEstado={filterEstado}
        onFilterChange={setFilterEstado}
        isLoading={isLoading}
      />

      {/* Modal: Crear solicitud */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Sala</DialogTitle>
          </DialogHeader>
          <SolicitudForm
            onSubmit={handleSubmit}
            onCancel={() => setShowCreateForm(false)}
            isLoading={isSubmitting}
            userCarreraId={!isGestor ? (user as any)?.carrera_id : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle solicitud */}
      <Dialog open={!!selectedSolicitud} onOpenChange={(open) => { if (!open) setSelectedSolicitud(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
          </DialogHeader>
          {selectedSolicitud && (
            <SolicitudDetail
              solicitud={selectedSolicitud}
              isGestor={isGestor}
              onUpdated={handleDetailUpdated}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
