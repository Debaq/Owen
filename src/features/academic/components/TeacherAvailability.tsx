import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

import { BloqueHorario } from '@/shared/types/models';
import { getBloques, getDocenteDisponibilidad, saveDocenteDisponibilidad } from '@/features/settings/services/settingsService';

interface TeacherAvailabilityProps {
  docenteId: string;
}

const DIAS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
];

export function TeacherAvailability({ docenteId }: TeacherAvailabilityProps) {
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<{dia_semana: number, bloque_id: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [bData, dData] = await Promise.all([
          getBloques(),
          getDocenteDisponibilidad(docenteId)
        ]);
        setBloques(bData);
        setDisponibilidad(dData);
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar disponibilidad');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [docenteId]);

  // Group blocks by orden (time slot)
  const rows = useMemo(() => {
    const grouped = new Map();
    bloques.forEach(b => {
      if (!grouped.has(b.orden)) {
        grouped.set(b.orden, {
            orden: b.orden,
            nombre: b.nombre,
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
            byDay: {} as Record<number, BloqueHorario>
        });
      }
      grouped.get(b.orden).byDay[b.dia_semana] = b;
    });
    return Array.from(grouped.values()).sort((a, b) => a.orden - b.orden);
  }, [bloques]);

  const toggleBlock = (dia: number, bloqueId: string) => {
    setDisponibilidad(prev => {
      const exists = prev.find(d => d.dia_semana === dia && d.bloque_id === bloqueId);
      if (exists) {
        return prev.filter(d => !(d.dia_semana === dia && d.bloque_id === bloqueId));
      } else {
        return [...prev, { dia_semana: dia, bloque_id: bloqueId }];
      }
    });
  };

  const isSelected = (dia: number, bloqueId: string) => {
    return disponibilidad.some(d => d.dia_semana === dia && d.bloque_id === bloqueId);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveDocenteDisponibilidad(docenteId, disponibilidad);
      toast.success('Disponibilidad guardada correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = () => {
    const all = bloques.map(b => ({ dia_semana: b.dia_semana, bloque_id: b.id }));
    setDisponibilidad(all);
  };

  const handleDeselectAll = () => {
    setDisponibilidad([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bloques.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/50">
        <p className="text-muted-foreground italic">No hay bloques horarios configurados en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Grilla de Disponibilidad</h3>
          <p className="text-sm text-muted-foreground">Marque los bloques en los que el docente está disponible para clases.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>Seleccionar Todo</Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>Deseleccionar Todo</Button>
          <Button onClick={handleSave} disabled={isSaving} className="shadow-lg ml-2">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="overflow-auto border rounded-xl bg-white max-h-[600px] shadow-sm">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="bg-muted/50">
              <th className="p-3 border-b text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-32 bg-muted/50">Bloque</th>
              {DIAS.map(dia => (
                <th key={dia.id} className="p-3 border-b text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {dia.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orden} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 border-b">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{row.nombre}</span>
                    <span className="text-[10px] text-muted-foreground">{row.hora_inicio} - {row.hora_fin}</span>
                  </div>
                </td>
                {DIAS.map(dia => {
                  const block = row.byDay[dia.id];
                  if (!block) {
                      return <td key={dia.id} className="p-1 border-b border-l bg-gray-50/50"></td>;
                  }
                  
                  const active = isSelected(dia.id, block.id);
                  return (
                    <td 
                      key={dia.id} 
                      className="p-1 border-b border-l text-center"
                    >
                      <button
                        onClick={() => toggleBlock(dia.id, block.id)}
                        className={`w-full h-12 rounded-md transition-all flex items-center justify-center group ${
                          active 
                            ? 'bg-green-500 text-white shadow-inner scale-[0.98]' 
                            : 'bg-transparent hover:bg-green-50 text-transparent hover:text-green-300'
                        }`}
                      >
                        {active ? <Check className="h-5 w-5" /> : <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-gray-300 rounded"></div>
          <span>No disponible</span>
        </div>
      </div>
    </div>
  );
}
