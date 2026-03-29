import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { X, Loader2 } from 'lucide-react'
import type { Sala, BloqueHorario, Carrera } from '@/shared/types'
import { api } from '@/shared/lib/api'

const DIAS_SEMANA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const solicitudSchema = z.object({
  motivo: z.string().min(1, 'El motivo es requerido').max(500),
  carrera_id: z.string().optional(),
  tipo_sala: z.enum(['aula', 'laboratorio', 'auditorio', 'taller']).optional().nullable(),
  mobiliario_requerido: z.enum(['sillas_individuales', 'butacas', 'mesas_sillas', 'mesas_trabajo', 'computadores', 'mixto']).optional().nullable(),
  capacidad_requerida: z.coerce.number().int().min(1).max(1000).optional().nullable(),
  equipamiento_requerido: z.array(z.string()).default([]),
  fecha_inicio: z.string().min(1, 'Fecha inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha fin requerida'),
  bloques: z.array(z.string()).min(1, 'Debe seleccionar al menos un bloque'),
  sala_preferida_id: z.string().optional().nullable(),
  recurrente: z.boolean().default(false),
})

type SolicitudFormValues = z.infer<typeof solicitudSchema>

interface SolicitudFormProps {
  onSubmit: (data: SolicitudFormValues) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  userCarreraId?: string
}

export function SolicitudForm({ onSubmit, onCancel, isLoading = false, userCarreraId }: SolicitudFormProps) {
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [newEquip, setNewEquip] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SolicitudFormValues>({
    resolver: zodResolver(solicitudSchema) as any,
    defaultValues: {
      motivo: '',
      carrera_id: userCarreraId || '',
      tipo_sala: null,
      mobiliario_requerido: null,
      capacidad_requerida: null,
      equipamiento_requerido: [],
      fecha_inicio: '',
      fecha_fin: '',
      bloques: [],
      sala_preferida_id: null,
      recurrente: false,
    },
  })

  const selectedBloques = watch('bloques')
  const equipamiento = watch('equipamiento_requerido')

  useEffect(() => {
    async function loadData() {
      try {
        setIsFetching(true)
        const [bloquesRes, salasRes, carrerasRes] = await Promise.all([
          api.get('/bloques.php'),
          api.get('/salas.php'),
          api.get('/carreras.php'),
        ])
        setBloques(bloquesRes.data.data || [])
        setSalas((salasRes.data.data || []).filter((s: Sala) => s.activo))
        setCarreras(carrerasRes.data.data || [])
      } catch (err) {
        console.error('Error cargando datos:', err)
      } finally {
        setIsFetching(false)
      }
    }
    loadData()
  }, [])

  // Agrupar bloques por día
  const bloquesPorDia: Record<number, BloqueHorario[]> = {}
  bloques.forEach(b => {
    const dia = b.dia_semana
    if (!bloquesPorDia[dia]) bloquesPorDia[dia] = []
    bloquesPorDia[dia].push(b)
  })

  const toggleBloque = (bloqueId: string) => {
    const current = selectedBloques || []
    if (current.includes(bloqueId)) {
      setValue('bloques', current.filter(id => id !== bloqueId))
    } else {
      setValue('bloques', [...current, bloqueId])
    }
  }

  if (isFetching) return <div className="p-8 text-center italic">Cargando datos...</div>

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* Motivo */}
      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo de la solicitud *</Label>
        <textarea
          id="motivo"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
          placeholder="Ej: Clase de laboratorio de química para 2do año..."
          {...register('motivo')}
          disabled={isLoading}
        />
        {errors.motivo && <p className="text-xs text-red-500">{errors.motivo.message}</p>}
      </div>

      {/* Carrera (si es gestor puede elegir) */}
      {carreras.length > 0 && !userCarreraId && (
        <div className="space-y-2">
          <Label>Carrera</Label>
          <Select onValueChange={(val) => setValue('carrera_id', val === '_none' ? '' : val)} defaultValue={watch('carrera_id') || '_none'}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar carrera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sin especificar</SelectItem>
              {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Tipo, Capacidad, Mobiliario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Sala</Label>
          <Select onValueChange={(val) => setValue('tipo_sala', val === '_none' ? null : val as any)} defaultValue="_none">
            <SelectTrigger>
              <SelectValue placeholder="Cualquiera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Cualquiera</SelectItem>
              <SelectItem value="aula">Aula</SelectItem>
              <SelectItem value="laboratorio">Laboratorio</SelectItem>
              <SelectItem value="auditorio">Auditorio</SelectItem>
              <SelectItem value="taller">Taller</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacidad_requerida">Capacidad Mínima</Label>
          <Input
            id="capacidad_requerida"
            type="number"
            placeholder="Ej: 30"
            {...register('capacidad_requerida')}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Mobiliario</Label>
          <Select onValueChange={(val) => setValue('mobiliario_requerido', val === '_none' ? null : val as any)} defaultValue="_none">
            <SelectTrigger>
              <SelectValue placeholder="Cualquiera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Cualquiera</SelectItem>
              <SelectItem value="sillas_individuales">Sillas Individuales</SelectItem>
              <SelectItem value="butacas">Butacas</SelectItem>
              <SelectItem value="mesas_sillas">Mesas con Sillas</SelectItem>
              <SelectItem value="mesas_trabajo">Mesas de Trabajo</SelectItem>
              <SelectItem value="computadores">Computadores</SelectItem>
              <SelectItem value="mixto">Mixto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Equipamiento requerido */}
      <div className="space-y-2">
        <Label>Equipamiento Requerido</Label>
        <div className="flex gap-2">
          <Input value={newEquip} onChange={e => setNewEquip(e.target.value)} placeholder="Ej: Proyector" />
          <Button type="button" onClick={() => {
            if (newEquip) {
              setValue('equipamiento_requerido', [...equipamiento, newEquip])
              setNewEquip('')
            }
          }}>+</Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {equipamiento.map((e, i) => (
            <Badge key={i} variant="outline" className="text-[10px] flex items-center gap-1">
              {e} <X className="h-2 w-2 cursor-pointer" onClick={() => setValue('equipamiento_requerido', equipamiento.filter((_, idx) => idx !== i))} />
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
          <Input id="fecha_inicio" type="date" {...register('fecha_inicio')} disabled={isLoading} />
          {errors.fecha_inicio && <p className="text-xs text-red-500">{errors.fecha_inicio.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_fin">Fecha Fin *</Label>
          <Input id="fecha_fin" type="date" {...register('fecha_fin')} disabled={isLoading} />
          {errors.fecha_fin && <p className="text-xs text-red-500">{errors.fecha_fin.message}</p>}
        </div>
      </div>

      {/* Recurrente */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="recurrente" {...register('recurrente')} className="rounded" />
        <Label htmlFor="recurrente" className="cursor-pointer">Solicitud recurrente (semanal)</Label>
      </div>

      {/* Selección de bloques */}
      <div className="space-y-2">
        <Label>Bloques Horarios * <span className="text-muted-foreground text-xs">({selectedBloques.length} seleccionados)</span></Label>
        {errors.bloques && <p className="text-xs text-red-500">{errors.bloques.message}</p>}
        <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-3">
          {Object.keys(bloquesPorDia).sort((a, b) => Number(a) - Number(b)).map(diaKey => {
            const dia = Number(diaKey)
            const diaLabel = DIAS_SEMANA[dia] || `Día ${dia}`
            return (
              <div key={dia}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{diaLabel}</p>
                <div className="flex flex-wrap gap-1">
                  {bloquesPorDia[dia].map(b => {
                    const selected = selectedBloques.includes(b.id)
                    return (
                      <Badge
                        key={b.id}
                        variant={selected ? 'default' : 'outline'}
                        className={`cursor-pointer text-xs transition-colors ${selected ? '' : 'hover:bg-muted'}`}
                        onClick={() => toggleBloque(b.id)}
                      >
                        {b.hora_inicio}-{b.hora_fin}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {Object.keys(bloquesPorDia).length === 0 && (
            <p className="text-sm text-muted-foreground italic">No hay bloques horarios configurados</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Sala preferida */}
      <div className="space-y-2">
        <Label>Sala Preferida (opcional)</Label>
        <Select onValueChange={(val) => setValue('sala_preferida_id', val === '_none' ? null : val)} defaultValue="_none">
          <SelectTrigger>
            <SelectValue placeholder="Sin preferencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Sin preferencia</SelectItem>
            {salas.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.code} - {s.name} (Cap: {s.capacidad})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Buscando salas...
            </>
          ) : (
            'Buscar y Solicitar'
          )}
        </Button>
      </div>
    </form>
  )
}
