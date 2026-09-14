import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { WizardStepper } from '../components/WizardStepper'
import { StepRoom } from '../components/StepRoom'
import { StepTimeSlot } from '../components/StepTimeSlot'
import { CellAssignmentModal } from '../components/CellAssignmentModal'
import { useWizardState } from '../hooks/useWizardState'
import type { BloqueHorario } from '@/shared/types'
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, RotateCcw } from 'lucide-react'

export function ScheduleWizardView() {
  const { state, set, goNext, goBack, reset, canGoNext } = useWizardState()
  const navigate = useNavigate()

  // Estado local del modal
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ dia: number; bloque: BloqueHorario } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCellClick = (dia: number, bloque: BloqueHorario) => {
    setSelectedCell({ dia, bloque })
    setModalOpen(true)
  }

  const handleModalSuccess = () => {
    setModalOpen(false)
    setRefreshKey(k => k + 1)
  }

  if (!state.temporada) {
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Sin temporada activa</h2>
          <p className="text-muted-foreground mb-4">
            Necesitas una temporada (semestre) activa para crear horarios.
          </p>
          <Link to="/admin/system/bloques">
            <Button>Ir a configuración</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asistente de Horarios</h1>
          <p className="text-sm text-muted-foreground">
            Temporada: {state.temporada.nombre}
          </p>
        </div>
        <Link to="/admin/schedules">
          <Button variant="ghost" size="sm">
            <Calendar className="h-4 w-4 mr-2" /> Vista clásica
          </Button>
        </Link>
      </div>

      {/* Stepper */}
      <WizardStepper currentStep={state.currentStep} />

      {/* Contenido del paso */}
      <Card>
        <CardContent className="p-6">
          {state.currentStep === 1 && (
            <StepRoom
              selectedRoom={state.selectedRoom}
              onSelect={(room) => set('selectedRoom', room)}
            />
          )}
          {state.currentStep === 2 && state.selectedRoom && (
            <StepTimeSlot
              room={state.selectedRoom}
              temporadaId={state.temporada.id}
              sistemaId={state.temporada.sistema_bloque_id}
              refreshKey={refreshKey}
              onCellClick={handleCellClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={state.currentStep === 2 ? goBack : undefined}
          disabled={state.currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
        </Button>

        <div className="flex gap-2">
          {state.currentStep === 1 && (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Siguiente <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {state.currentStep === 2 && (
            <>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-2" /> Cambiar sala
              </Button>
              <Button onClick={() => navigate('/admin/schedules')}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Listo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal de asignación */}
      {selectedCell && state.selectedRoom && (
        <CellAssignmentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          dia={selectedCell.dia}
          bloque={selectedCell.bloque}
          room={state.selectedRoom}
          temporadaId={state.temporada.id}
          defaultFechaInicio={state.temporada.fecha_inicio || new Date().toISOString().split('T')[0]}
          defaultFechaFin={state.temporada.fecha_fin || new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
