import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { MapLocationPicker } from '@/features/buildings/components/MapLocationPicker';
import { POI_CATEGORIES_CONFIG, type POI, type POICategory } from '../types';
import { createPOI, updatePOI } from '../services/mapService';
import { getAllBuildings } from '@/features/rooms/services/roomService';
import { toast } from 'sonner';
import type { Edificio } from '@/shared/types';

const COMMON_ICONS = [
  '📍', '🅿️', '🚻', '📚', '☕', '🚪', '🚌', '🚲', '🏥', '🛡️',
  '📶', '🧯', '🚨', '🛗', '🪜', '🌳', '🏛️', '🏋️', '🎭',
  '🏧', '🍕', '🍔', '🥪', '🥤', '🛑', '⚠️', '♿', '🚰',
  '🚮', '♻️', '📢', '🎓', '🔬', '💻', '🔋', '👁️', '💡', '🔧'
];

interface POIFormProps {
  poi?: POI;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function POIForm({ poi, onSuccess, onCancel }: POIFormProps) {
  const isEdit = !!poi;
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<POICategory>(poi?.category || 'otro');
  
  const initialCategoryConfig = POI_CATEGORIES_CONFIG.find(c => c.category === (poi?.category || 'otro'));
  const [selectedIcon, setSelectedIcon] = useState(poi?.icon || initialCategoryConfig?.icon || '📍');
  
  const [lat, setLat] = useState(poi?.lat || -41.48780);
  const [lng, setLng] = useState(poi?.lng || -72.89699);
  const [edificioId, setEdificioId] = useState<string | undefined>(poi?.edificio_id);
  const [edificios, setEdificios] = useState<Edificio[]>([]);

  useEffect(() => {
    getAllBuildings().then(setEdificios).catch(() => setEdificios([]));
  }, []);

  const handleCategoryChange = (value: POICategory) => {
    setCategory(value);
    const config = POI_CATEGORIES_CONFIG.find(c => c.category === value);
    if (config) {
      setSelectedIcon(config.icon);
    }
  };

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: poi?.name || '',
      description: poi?.description || '',
    },
  });

  const categoryConfig = POI_CATEGORIES_CONFIG.find(c => c.category === category);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const poiData: Partial<POI> = {
        ...data,
        category,
        lat,
        lng,
        edificio_id: edificioId,
        icon: selectedIcon,
        color: categoryConfig?.color,
        activo: true,
      };

      if (isEdit) {
        await updatePOI({ ...poi, ...poiData } as POI);
        toast.success('Punto de interés actualizado exitosamente');
      } else {
        await createPOI(poiData);
        toast.success('Punto de interés creado exitosamente');
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="category">Categoría</Label>
        <Select value={category} onValueChange={(value) => handleCategoryChange(value as POICategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POI_CATEGORIES_CONFIG.map(({ category, label, icon }) => (
              <SelectItem key={category} value={category}>
                {icon} {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-2 block">Icono Personalizado</Label>
        <div className="grid grid-cols-8 gap-2 p-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto bg-gray-50">
          {COMMON_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setSelectedIcon(icon)}
              className={`text-2xl h-10 w-10 flex items-center justify-center rounded transition-colors ${
                selectedIcon === icon
                  ? 'bg-blue-200 border-2 border-blue-500 shadow-sm'
                  : 'hover:bg-white hover:shadow-sm'
              }`}
              title="Seleccionar icono"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          {...register('name', { required: 'El nombre es requerido' })}
          placeholder="Ej: Estacionamiento Principal"
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          {...register('description')}
          className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Descripción opcional..."
        />
      </div>

      <div>
        <Label htmlFor="edificio">Edificio (opcional)</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={edificioId || 'none'} 
          onChange={(e) => setEdificioId(e.target.value === 'none' ? undefined : e.target.value)}
        >
          <option value="none">Ninguno (ubicación exterior)</option>
          {edificios.map((edificio) => (
            <option key={edificio.id} value={edificio.id}>
              {edificio.name} ({edificio.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          💡 Asociar a un edificio permite ver este POI en el popup del edificio
        </p>
      </div>

      <div>
        <Label>Ubicación en el Mapa *</Label>
        <MapLocationPicker
          lat={lat}
          lng={lng}
          onLocationChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
