import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { ImageUpload } from '@/shared/components/ui/ImageUpload'
import { Separator } from '@/shared/components/ui/separator'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/shared/components/ui/select'
import type { Sala, Edificio, Carrera, UnidadAcademica } from '@/shared/types/models'
import type { RoomFormData } from '../services/roomService'
import { getAllBuildings } from '../services/roomService'
import { getCarreras, getUnidades } from '@/features/settings/services/settingsService'
import { AlertTriangle, X } from 'lucide-react'

const roomFormSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(20, 'Máximo 20 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  edificio_id: z.string().min(1, 'Debe seleccionar un edificio'),
  piso: z.coerce.number().int().min(1, 'El piso debe ser mayor a 0').max(20, 'Máximo 20 pisos'),
  tipo: z.enum(['aula', 'laboratorio', 'auditorio', 'taller', 'sala_reuniones', 'oficina', 'biblioteca', 'medioteca']),
  capacidad: z.coerce.number().int().min(1, 'La capacidad debe ser mayor a 0').max(1000, 'Máximo 1000 personas'),
  mobiliario: z.array(z.string()).default([]),
  equipamiento: z.array(z.string()).default([]),
  fotos: z.array(z.string()).default([]),
  tipo_gestion: z.enum(['central', 'carrera', 'unidad']).default('central'),
  gestion_carrera_id: z.string().optional().nullable(),
  gestion_unidad_id: z.string().optional().nullable(),
  reglas: z.string().max(500, 'Máximo 500 caracteres').default(''),
  lat: z.coerce.number().min(-56).max(-17).optional(),
  lng: z.coerce.number().min(-110).max(-66).optional(),
  activo: z.boolean().default(true),
})

type RoomFormValues = z.infer<typeof roomFormSchema>

interface RoomFormProps {
  initialData?: Sala
  onSubmit: (data: RoomFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function RoomForm({ initialData, onSubmit, onCancel, isLoading = false }: RoomFormProps) {
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [newMobiliario, setNewMobiliario] = useState('')
  const [newEquipamiento, setNewEquipamiento] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema) as any,
    defaultValues: initialData
      ? {
          ...initialData,
          fotos: initialData.fotos || [],
          tipo_gestion: initialData.tipo_gestion || 'central',
          gestion_carrera_id: initialData.gestion_carrera_id || null,
          gestion_unidad_id: initialData.gestion_unidad_id || null,
        }
      : {
          code: '',
          name: '',
          edificio_id: '',
          piso: 1,
          tipo: 'aula',
          capacidad: 30,
          mobiliario: [],
          equipamiento: [],
          fotos: [],
          tipo_gestion: 'central',
          gestion_carrera_id: null,
          gestion_unidad_id: null,
          reglas: '',
          lat: -41.48780,
          lng: -72.89699,
          activo: true,
        },
  })

  const currentTipoGestion = watch('tipo_gestion')

  // Cargar datos maestros cada vez que el componente se monta
  useEffect(() => {
    const loadBaseData = async () => {
      try {
        setIsFetching(true)
        if (import.meta.env.DEV) console.log('RoomForm: Cargando datos maestros...');
        const [eData, cData, uData] = await Promise.all([
          getAllBuildings(),
          getCarreras(),
          getUnidades()
        ])
        setEdificios(eData)
        setCarreras(cData)
        setUnidades(uData)
      } catch (err) {
        console.error('Error cargando maestros en RoomForm:', err)
      } finally {
        setIsFetching(false)
      }
    }
    loadBaseData()
  }, [])

  const handleFormSubmit = async (data: RoomFormValues) => {
    const finalData = { ...data };
    if (data.tipo_gestion === 'central') {
        finalData.gestion_carrera_id = null;
        finalData.gestion_unidad_id = null;
    } else if (data.tipo_gestion === 'carrera') {
        finalData.gestion_unidad_id = null;
    } else if (data.tipo_gestion === 'unidad') {
        finalData.gestion_carrera_id = null;
    }
    await onSubmit(finalData as any)
  }

  if (isFetching) return <div className="p-8 text-center italic">Cargando datos maestros...</div>

  if (edificios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 border-2 border-dashed rounded-lg bg-amber-50">
        <AlertTriangle className="h-8 w-8 text-amber-600" />
        <h3 className="text-lg font-semibold">Configuración requerida</h3>
        <p className="text-amber-800 text-sm">Debe registrar un edificio primero.</p>
        <Button onClick={() => window.location.href = '/admin/buildings'}>Ir a Edificios</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código *</Label>
          <Input id="code" {...register('code')} disabled={isLoading} />
          {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input id="name" {...register('name')} disabled={isLoading} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label>Edificio *</Label>
          <Select 
            onValueChange={(val) => setValue('edificio_id', val)} 
            defaultValue={watch('edificio_id')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar edificio" />
            </SelectTrigger>
            <SelectContent>
              {edificios.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="piso">Piso *</Label>
          <Input id="piso" type="number" {...register('piso')} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Sala *</Label>
          <Select 
            onValueChange={(val) => setValue('tipo', val as any)} 
            defaultValue={watch('tipo')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aula">Aula</SelectItem>
              <SelectItem value="laboratorio">Laboratorio</SelectItem>
              <SelectItem value="auditorio">Auditorio</SelectItem>
              <SelectItem value="taller">Taller</SelectItem>
              <SelectItem value="sala_reuniones">Sala de Reuniones</SelectItem>
              <SelectItem value="oficina">Oficina</SelectItem>
              <SelectItem value="biblioteca">Biblioteca</SelectItem>
              <SelectItem value="medioteca">Medioteca</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacidad">Capacidad *</Label>
          <Input id="capacidad" type="number" {...register('capacidad')} disabled={isLoading} />
        </div>
      </div>

      <Separator />

      {/* GESTIÓN DE LA SALA */}
      <div className="bg-muted/30 p-4 rounded-lg space-y-4 border border-blue-100">
        <h4 className="text-sm font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
            Gestión y Administración
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Gestionado por:</Label>
                <Select 
                    onValueChange={(val) => {
                        setValue('tipo_gestion', val as any);
                        if (val === 'central') {
                            setValue('gestion_carrera_id', null);
                            setValue('gestion_unidad_id', null);
                        }
                    }} 
                    defaultValue={watch('tipo_gestion')}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="central">Nivel Central (Default)</SelectItem>
                        <SelectItem value="carrera" disabled={carreras.length === 0}>Carrera Específica</SelectItem>
                        <SelectItem value="unidad" disabled={unidades.length === 0}>Unidad Académica</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {currentTipoGestion === 'carrera' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                    <Label>Carrera responsable:</Label>
                    <Select 
                        onValueChange={(val) => setValue('gestion_carrera_id', val)} 
                        defaultValue={watch('gestion_carrera_id') || undefined}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar carrera" />
                        </SelectTrigger>
                        <SelectContent>
                            {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {currentTipoGestion === 'unidad' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                    <Label>Unidad responsable:</Label>
                    <Select 
                        onValueChange={(val) => setValue('gestion_unidad_id', val)} 
                        defaultValue={watch('gestion_unidad_id') || undefined}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar unidad" />
                        </SelectTrigger>
                        <SelectContent>
                            {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
        {(carreras.length === 0 && unidades.length === 0) && (
            <p className="text-[10px] text-muted-foreground italic">
                Nota: No hay carreras ni unidades registradas para delegar la gestión.
            </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Fotos de la Sala</Label>
        <ImageUpload 
          value={watch('fotos') || []} 
          onChange={(urls) => setValue('fotos', urls)} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>Mobiliario</Label>
            <div className="flex gap-2">
                <Input value={newMobiliario} onChange={e => setNewMobiliario(e.target.value)} placeholder="Ej: Pizarra" />
                <Button type="button" onClick={() => { if(newMobiliario) { setValue('mobiliario', [...watch('mobiliario'), newMobiliario]); setNewMobiliario(''); } }}>+</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
                {watch('mobiliario').map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] flex items-center gap-1">
                        {m} <X className="h-2 w-2 cursor-pointer" onClick={() => setValue('mobiliario', watch('mobiliario').filter((_, idx) => idx !== i))} />
                    </Badge>
                ))}
            </div>
        </div>
        <div className="space-y-2">
            <Label>Equipamiento</Label>
            <div className="flex gap-2">
                <Input value={newEquipamiento} onChange={e => setNewEquipamiento(e.target.value)} placeholder="Ej: Proyector" />
                <Button type="button" onClick={() => { if(newEquipamiento) { setValue('equipamiento', [...watch('equipamiento'), newEquipamiento]); setNewEquipamiento(''); } }}>+</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
                {watch('equipamiento').map((e, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] flex items-center gap-1">
                        {e} <X className="h-2 w-2 cursor-pointer" onClick={() => setValue('equipamiento', watch('equipamiento').filter((_, idx) => idx !== i))} />
                    </Badge>
                ))}
            </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reglas">Reglas de uso</Label>
        <textarea
          id="reglas"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
          placeholder="Ej: Prohibido comer..."
          {...register('reglas')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Sala'}</Button>
      </div>
    </form>
  )
}
