import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { WizardStepper } from '../components/WizardStepper'
import { StepRoom } from '../components/StepRoom'
import { StepTimeSlot } from '../components/StepTimeSlot'
import { StepAssignment } from '../components/StepAssignment'
import { useWizardState } from '../hooks/useWizardState'
import { ArrowLeft, ArrowRight, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react'

export function ScheduleWizardView() {
  const { state, set, goNext, goBack, reset, canGoNext, submit } = useWizardState()

  if (state.submitted) {
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Horario creado</h2>
          <p className="text-muted-foreground mb-6">
            Se programo correctamente en {state.selectedRoom?.code} - {state.selectedRoom?.name}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Crear otro
            </Button>
            <Link to="/admin/schedules">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" /> Ver horarios
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
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
            <Button>Ir a configuracion</Button>
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
            <Calendar className="h-4 w-4 mr-2" /> Vista clasica
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
              selectedDay={state.selectedDay}
              selectedBlock={state.selectedBlock}
              recurrencia={state.recurrencia}
              fechaInicio={state.fechaInicio}
              fechaFin={state.fechaFin}
              onSelectCell={(day, block) => { set('selectedDay', day); set('selectedBlock', block) }}
              onRecurrenciaChange={(v) => set('recurrencia', v)}
              onFechaInicioChange={(v) => set('fechaInicio', v)}
              onFechaFinChange={(v) => set('fechaFin', v)}
            />
          )}
          {state.currentStep === 3 && (
            <StepAssignment
              state={state}
              set={set}
            />
          )}
        </CardContent>
      </Card>

      {/* Navegacion */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={state.currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Atras
        </Button>

        {state.currentStep < 3 ? (
          <Button onClick={goNext} disabled={!canGoNext()}>
            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={state.submitting}>
            {state.submitting ? 'Creando...' : 'Crear Horario'}
          </Button>
        )}
      </div>
    </div>
  )
}
