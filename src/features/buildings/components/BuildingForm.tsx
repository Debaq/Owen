import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapLocationPicker } from './MapLocationPicker';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from 'sonner';
import { ImageUpload } from '@/shared/components/ui/ImageUpload';
import type { Edificio as Building } from '@/shared/types/models';

const buildingSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  pisos: z.number().int().min(1, 'Debe tener al menos 1 piso'),
  descripcion: z.string().optional(),
  fotos: z.array(z.string()).default([]),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

interface BuildingFormProps {
  building?: Building;
  onSubmit: (data: BuildingFormData) => Promise<void>;
  onCancel: () => void;
}

export function BuildingForm({ building, onSubmit, onCancel }: BuildingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapLocation, setMapLocation] = useState({
    lat: building?.lat ?? -41.48780,
    lng: building?.lng ?? -72.89699,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema) as any,
    defaultValues: building ? {
      name: building.name,
      code: building.code,
      lat: building.lat,
      lng: building.lng,
      pisos: building.pisos,
      descripcion: building.descripcion || '',
      fotos: building.fotos || [],
    } : {
      name: '',
      code: '',
      lat: -41.48780,
      lng: -72.89699,
      pisos: 1,
      descripcion: '',
      fotos: [],
    },
  });

  const handleLocationChange = (lat: number, lng: number) => {
    setMapLocation({ lat, lng });
    setValue('lat', lat);
    setValue('lng', lng);
  };

  const handleFormSubmit = async (data: BuildingFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        lat: mapLocation.lat,
        lng: mapLocation.lng,
      });
      toast.success(building ? 'Edificio actualizado' : 'Edificio creado');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Edificio</Label>
          <Input id="name" {...register('name')} placeholder="Ej: Edificio A" />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input id="code" {...register('code')} placeholder="Ej: EDF-A" />
          {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pisos">Número de Pisos</Label>
        <Input id="pisos" type="number" min="1" {...register('pisos', { valueAsNumber: true })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción (Opcional)</Label>
        <textarea
          id="descripcion"
          {...register('descripcion')}
          className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Información adicional..."
        />
      </div>

      <div className="space-y-2">
        <Label>Fotos del Edificio</Label>
        <ImageUpload 
          value={watch('fotos')} 
          onChange={(urls) => setValue('fotos', urls)} 
        />
      </div>

      <div className="space-y-2">
        <Label>Ubicación en el Campus</Label>
        <MapLocationPicker
          lat={mapLocation.lat}
          lng={mapLocation.lng}
          onLocationChange={handleLocationChange}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background pb-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : building ? 'Actualizar' : 'Crear Edificio'}
        </Button>
      </div>
    </form>
  );
}
