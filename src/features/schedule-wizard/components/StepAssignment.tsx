import { useState, useEffect } from 'react'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Textarea } from '@/shared/components/ui/textarea'
import { Card } from '@/shared/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import {
  getAllCareers, getLevelsByCareer, getSubjectsByLevel, getAllTeachers,
} from '@/features/schedules/services/scheduleService'
import type { Carrera, Nivel, Asignatura, Docente } from '@/shared/types'
import type { WizardState } from '../hooks/useWizardState'
import { QuickCreateCarrera } from './QuickCreateCarrera'
import { QuickCreateNivel } from './QuickCreateNivel'
import { QuickCreateAsignatura } from './QuickCreateAsignatura'
import { QuickCreateDocente } from './QuickCreateDocente'
import { Plus, MapPin, Clock, BookOpen, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

const TIPOS = [
  { value: 'clase', label: 'Clase', color: 'bg-blue-600' },
  { value: 'evento', label: 'Evento', color: 'bg-purple-600' },
  { value: 'examen', label: 'Examen', color: 'bg-orange-600' },
  { value: 'taller', label: 'Taller', color: 'bg-green-600' },
] as const

interface StepAssignmentProps {
  state: WizardState
  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}

export function StepAssignment({ state, set }: StepAssignmentProps) {
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])

  // Quick-create dialogs
  const [showCarrera, setShowCarrera] = useState(false)
  const [showNivel, setShowNivel] = useState(false)
  const [showAsignatura, setShowAsignatura] = useState(false)
  const [showDocente, setShowDocente] = useState(false)

  // Cargar maestros
  useEffect(() => {
    Promise.all([getAllCareers(), getAllTeachers()])
      .then(([c, d]) => { setCarreras(c); setDocentes(d) })
  }, [])

  // Cargar niveles cuando cambia carrera
  useEffect(() => {
    if (state.selectedCarrera) {
      getLevelsByCareer(state.selectedCarrera.id).then(setNiveles)
    } else {
      setNiveles([])
    }
  }, [state.selectedCarrera?.id])

  // Cargar asignaturas cuando cambia nivel
  useEffect(() => {
    if (state.selectedNivel) {
      getSubjectsByLevel(state.selectedNivel.id).then(setAsignaturas)
    } else {
      setAsignaturas([])
    }
  }, [state.selectedNivel?.id])

  const handleCarreraChange = (id: string) => {
    const c = carreras.find(x => x.id === id) || null
    set('selectedCarrera', c)
    set('selectedNivel', null)
    set('selectedAsignatura', null)
  }

  const handleNivelChange = (id: string) => {
    const n = niveles.find(x => x.id === id) || null
    set('selectedNivel', n)
    set('selectedAsignatura', null)
  }

  const handleAsignaturaChange = (id: string) => {
    set('selectedAsignatura', asignaturas.find(x => x.id === id) || null)
  }

  const handleDocenteChange = (id: string) => {
    set('selectedDocente', docentes.find(x => x.id === id) || null)
  }

  const isClase = state.tipo === 'clase'

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Que se hara en este bloque?</h3>

      {/* Tipo */}
      <div className="grid grid-cols-4 gap-2">
        {TIPOS.map(t => (
          <button
            key={t.value}
            onClick={() => set('tipo', t.value)}
            className={cn(
              'py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all',
              state.tipo === t.value
                ? `${t.color} text-white border-transparent`
                : 'border-gray-200 hover:border-gray-400',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cascada academica (solo para clase) */}
      {isClase && (
        <div className="space-y-3 border rounded-lg p-4">
          {/* Carrera */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Carrera</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowCarrera(true)}>
                <Plus className="h-3 w-3 mr-1" /> Nueva
              </Button>
            </div>
            <Select value={state.selectedCarrera?.id || ''} onValueChange={handleCarreraChange}>
              <SelectTrigger><SelectValue placeholder="Seleccionar carrera..." /></SelectTrigger>
              <SelectContent>
                {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Nivel */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Nivel</Label>
              {state.selectedCarrera && (
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNivel(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Nuevo
                </Button>
              )}
            </div>
            <Select value={state.selectedNivel?.id || ''} onValueChange={handleNivelChange} disabled={!state.selectedCarrera}>
              <SelectTrigger><SelectValue placeholder={state.selectedCarrera ? 'Seleccionar nivel...' : 'Selecciona carrera primero'} /></SelectTrigger>
              <SelectContent>
                {niveles.map(n => <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Asignatura */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Asignatura</Label>
              {state.selectedNivel && (
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAsignatura(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Nueva
                </Button>
              )}
            </div>
            <Select value={state.selectedAsignatura?.id || ''} onValueChange={handleAsignaturaChange} disabled={!state.selectedNivel}>
              <SelectTrigger><SelectValue placeholder={state.selectedNivel ? 'Seleccionar asignatura...' : 'Selecciona nivel primero'} /></SelectTrigger>
              <SelectContent>
                {asignaturas.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Docente (siempre visible) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Docente (opcional)</Label>
          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowDocente(true)}>
            <Plus className="h-3 w-3 mr-1" /> Nuevo
          </Button>
        </div>
        <Select value={state.selectedDocente?.id || ''} onValueChange={handleDocenteChange}>
          <SelectTrigger><SelectValue placeholder="Seleccionar docente..." /></SelectTrigger>
          <SelectContent>
            {docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Observaciones */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Observaciones</Label>
        <Textarea
          placeholder="Notas adicionales..."
          value={state.observaciones}
          onChange={e => set('observaciones', e.target.value)}
          rows={2}
        />
      </div>

      {/* Resumen */}
      <Card className="p-4 bg-muted/50">
        <h4 className="text-sm font-semibold mb-2">Resumen</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{state.selectedRoom?.code || '—'} - {state.selectedRoom?.name || ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{state.selectedDay ? DIAS[state.selectedDay] : '—'} {state.selectedBlock?.hora_inicio || ''}-{state.selectedBlock?.hora_fin || ''}</span>
          </div>
          {isClase && state.selectedAsignatura && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{state.selectedAsignatura.code} - {state.selectedAsignatura.name}</span>
            </div>
          )}
          {state.selectedDocente && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{state.selectedDocente.name}</span>
            </div>
          )}
          <div className="col-span-2">
            <Badge variant="secondary" className="text-xs capitalize">{state.tipo}</Badge>
            <Badge variant="outline" className="text-xs capitalize ml-1">{state.recurrencia}</Badge>
          </div>
        </div>
      </Card>

      {/* Quick-create dialogs */}
      <QuickCreateCarrera
        open={showCarrera}
        onOpenChange={setShowCarrera}
        onCreated={(c) => { setCarreras(prev => [...prev, c]); set('selectedCarrera', c); set('selectedNivel', null); set('selectedAsignatura', null) }}
      />
      {state.selectedCarrera && (
        <QuickCreateNivel
          open={showNivel}
          onOpenChange={setShowNivel}
          carreraId={state.selectedCarrera.id}
          onCreated={(n) => { setNiveles(prev => [...prev, n]); set('selectedNivel', n); set('selectedAsignatura', null) }}
        />
      )}
      {state.selectedCarrera && state.selectedNivel && (
        <QuickCreateAsignatura
          open={showAsignatura}
          onOpenChange={setShowAsignatura}
          carreraId={state.selectedCarrera.id}
          nivelId={state.selectedNivel.id}
          onCreated={(a) => { setAsignaturas(prev => [...prev, a]); set('selectedAsignatura', a) }}
        />
      )}
      <QuickCreateDocente
        open={showDocente}
        onOpenChange={setShowDocente}
        carreraId={state.selectedCarrera?.id}
        onCreated={(d) => { setDocentes(prev => [...prev, d]); set('selectedDocente', d) }}
      />
    </div>
  )
}
