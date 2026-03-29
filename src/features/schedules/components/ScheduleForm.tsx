import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  getAllCareers,
  getLevelsByCareer,
  getSubjectsByLevel,
  getAllTeachers,
  getAllActiveRooms,
  createSchedule,
} from '../services/scheduleService'
import type { Carrera, Nivel, Asignatura, Docente, Sala, BloqueHorario } from '@/shared/types'

const formSchema = z.object({
  tipo: z.enum(['clase', 'evento', 'examen', 'taller']),
  asignatura_id: z.string().optional().nullable(),
  docente_id: z.string().optional().nullable(),
  sala_id: z.string().min(1, 'La sala es requerida'),
  nivel_id: z.string().optional().nullable(),
  recurrencia: z.enum(['semanal', 'quincenal', 'mensual', 'unica', 'anual']),
  fecha_inicio: z.string().min(1, 'Fecha inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha fin requerida'),
  observaciones: z.string().optional().nullable(),
})

interface ScheduleFormProps {
  dia: number
  bloque: BloqueHorario
  temporadaId: string
  initialSalaId?: string
  initialDocenteId?: string
  initialNivelId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function ScheduleForm({
  dia,
  bloque,
  temporadaId,
  initialSalaId,
  initialDocenteId,
  initialNivelId,
  onSuccess,
  onCancel,
}: ScheduleFormProps) {
  const [loading, setLoading] = useState(false)
  
  // Maestros
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [salas, setSalas] = useState<Sala[]>([])

  // UI state
  const [selectedCarrera, setSelectedCarrera] = useState<string>('')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      tipo: 'clase',
      asignatura_id: null,
      docente_id: initialDocenteId || null,
      sala_id: initialSalaId || '',
      nivel_id: initialNivelId || null,
      recurrencia: 'semanal',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
      observaciones: '',
    },
  })

  useEffect(() => {
    const loadMasters = async () => {
      const [cData, dData, sData] = await Promise.all([
        getAllCareers(),
        getAllTeachers(),
        getAllActiveRooms()
      ])
      setCarreras(cData)
      setDocentes(dData)
      setSalas(sData)
    }
    loadMasters()
  }, [])

  useEffect(() => {
    if (selectedCarrera) {
      getLevelsByCareer(selectedCarrera).then(setNiveles)
    } else {
      setNiveles([])
    }
  }, [selectedCarrera])

  useEffect(() => {
    const nivelId = form.watch('nivel_id')
    if (nivelId) {
      getSubjectsByLevel(nivelId).then(setAsignaturas)
    } else {
      setAsignaturas([])
    }
  }, [form.watch('nivel_id')])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      await createSchedule({
        ...values,
        asignatura_id: values.asignatura_id || undefined,
        docente_id: values.docente_id || undefined,
        nivel_id: values.nivel_id || undefined,
        observaciones: values.observaciones || undefined,
        dia_semana: dia,
        bloque_id: bloque.id,
        temporada_id: temporadaId,
      })
      toast.success('Horario creado correctamente')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear horario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="clase">Clase</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="examen">Examen</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sala_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sala</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sala" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>Carrera</FormLabel>
            <Select value={selectedCarrera} onValueChange={setSelectedCarrera}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Carrera..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>

          <FormField
            control={form.control}
            name="nivel_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined} disabled={!selectedCarrera}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nivel..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {niveles.map(n => <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="asignatura_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asignatura</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined} disabled={!form.watch('nivel_id')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar asignatura" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {asignaturas.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="docente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Docente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar docente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {docentes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fecha_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Inicio</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fecha_fin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Fin</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl><Textarea {...field} value={field.value || ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear Horario'}</Button>
        </div>
      </form>
    </Form>
  )
}
