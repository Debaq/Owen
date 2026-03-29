import { Check, MapPin, Clock, BookOpen } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface WizardStepperProps {
  currentStep: 1 | 2 | 3
}

const steps = [
  { number: 1, label: 'Sala', icon: MapPin },
  { number: 2, label: 'Horario', icon: Clock },
  { number: 3, label: 'Asignacion', icon: BookOpen },
]

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive = step.number === currentStep
        const isCompleted = step.number < currentStep

        return (
          <div key={step.number} className="flex items-center">
            {/* Circulo */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  isCompleted && 'bg-green-600 border-green-600 text-white',
                  isActive && 'bg-blue-600 border-blue-600 text-white',
                  !isActive && !isCompleted && 'border-gray-300 text-gray-400',
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  isActive && 'text-blue-600',
                  isCompleted && 'text-green-600',
                  !isActive && !isCompleted && 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Linea conectora */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-16 md:w-24 h-0.5 mx-2 mb-5',
                  step.number < currentStep ? 'bg-green-600' : 'bg-gray-300',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
