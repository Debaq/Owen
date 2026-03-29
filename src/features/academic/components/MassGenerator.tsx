import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Wand2, Save, X, RotateCcw } from 'lucide-react';
import { addMinutes, format, parse } from 'date-fns';
import { toast } from 'sonner';
import { massCreateBloques } from '@/features/settings/services/settingsService';
import { BloqueHorario } from '@/shared/types/models';

interface MassGeneratorProps {
  sistemaId: string;
  onPreviewChange: (blocks: Partial<BloqueHorario>[]) => void;
  onSuccess: () => void;
  onCancel: () => void;
}

const DIAS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 7, label: 'Dom' },
];

export function MassGenerator({ sistemaId, onPreviewChange, onSuccess, onCancel }: MassGeneratorProps) {
  const [config, setConfig] = useState({
    horaInicio: '08:30',
    duracionBloque: 45,
    duracionReceso: 15,
    bloquesParaReceso: 2, // Nuevo: Receso cada X bloques
    cantidad: 8,
    prefijo: 'Bloque'
  });

  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([1, 2, 3, 4, 5]);
  const [preview, setPreview] = useState<Partial<BloqueHorario>[]>([]);

  useEffect(() => {
    return () => onPreviewChange([]);
  }, []);

  const toggleDia = (id: number) => {
    const newDias = diasSeleccionados.includes(id) 
      ? diasSeleccionados.filter(d => d !== id) 
      : [...diasSeleccionados, id];
    setDiasSeleccionados(newDias);
  };

  const generatePreview = () => {
    if (diasSeleccionados.length === 0) {
        toast.error("Seleccione al menos un día");
        return;
    }
    const allBlocks: Partial<BloqueHorario>[] = [];
    
    diasSeleccionados.forEach(diaId => {
        let currentStartTime = parse(config.horaInicio, 'HH:mm', new Date());
        for (let i = 1; i <= config.cantidad; i++) {
            const endTime = addMinutes(currentStartTime, config.duracionBloque);
            allBlocks.push({
                id: `preview-${diaId}-${i}`,
                nombre: `${config.prefijo} ${i}`,
                hora_inicio: format(currentStartTime, 'HH:mm'),
                hora_fin: format(endTime, 'HH:mm'),
                orden: i,
                dia_semana: diaId
            });
            
            // Si i es múltiplo de bloquesParaReceso, añadir el receso al tiempo de inicio del siguiente bloque
            if (i % config.bloquesParaReceso === 0) {
                currentStartTime = addMinutes(endTime, config.duracionReceso);
            } else {
                // Si no, el siguiente bloque empieza inmediatamente después
                currentStartTime = endTime;
            }
        }
    });
    setPreview(allBlocks);
    onPreviewChange(allBlocks);
  };

  const handleSave = async () => {
    try {
      await massCreateBloques(sistemaId, preview);
      toast.success('¡Jornada semanal creada!');
      onPreviewChange([]);
      onSuccess();
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  return (
    <div className="space-y-6 bg-primary/5 p-6 rounded-xl border-2 border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2 text-primary">
            <Wand2 className="h-5 w-5" />
            <h3 className="font-bold uppercase tracking-widest text-sm">Configurador de Jornada Inteligente</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { onPreviewChange([]); onCancel(); }}><X className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ajustes de Tiempo */}
        <div className="space-y-4 lg:col-span-2">
            <Label className="text-xs font-black text-muted-foreground uppercase tracking-tighter">1. Ajustes de Tiempo y Frecuencia</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-background rounded-xl border shadow-sm">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-primary">Inicio Jornada</Label>
                    <Input type="time" value={config.horaInicio} onChange={e => setConfig({...config, horaInicio: e.target.value})} className="h-9" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-primary">Minutos x Bloque</Label>
                    <Input type="number" value={config.duracionBloque} onChange={e => setConfig({...config, duracionBloque: parseInt(e.target.value) || 0})} className="h-9" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-primary">Minutos Receso</Label>
                    <Input type="number" value={config.duracionReceso} onChange={e => setConfig({...config, duracionReceso: parseInt(e.target.value) || 0})} className="h-9" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-primary">Bloques p/ día</Label>
                    <Input type="number" value={config.cantidad} onChange={e => setConfig({...config, cantidad: parseInt(e.target.value) || 0})} className="h-9" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-orange-600">Receso cada...</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            min="1"
                            value={config.bloquesParaReceso} 
                            onChange={e => setConfig({...config, bloquesParaReceso: parseInt(e.target.value) || 1})} 
                            className="h-9 border-orange-200 focus:ring-orange-500"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Bloques</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Selección de Días */}
        <div className="space-y-4">
            <Label className="text-xs font-black text-muted-foreground uppercase tracking-tighter">2. Aplicar a los Días</Label>
            <div className="grid grid-cols-4 gap-2 p-4 bg-background rounded-xl border shadow-sm">
                {DIAS.map(dia => (
                    <button
                        key={dia.id}
                        type="button"
                        onClick={() => toggleDia(dia.id)}
                        className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center text-[10px] font-black ${
                            diasSeleccionados.includes(dia.id)
                            ? 'bg-primary border-primary text-white shadow-md'
                            : 'bg-muted text-muted-foreground border-transparent hover:border-primary/30'
                        }`}
                    >
                        {dia.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pt-4">
        <Button onClick={generatePreview} variant="outline" className="px-16 py-6 border-primary border-2 text-primary hover:bg-primary hover:text-white font-black uppercase tracking-widest text-xs transition-all shadow-md">
            <RotateCcw className="h-4 w-4 mr-2" /> Previsualizar Jornada
        </Button>

        {preview.length > 0 && (
            <div className="flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 w-full bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="flex flex-col">
                    <span className="text-xs font-black text-green-800 uppercase tracking-tighter">¡Previsualización Lista!</span>
                    <p className="text-sm text-green-700">
                        Se han calculado <strong>{preview.length}</strong> franjas horarias con recesos cada <strong>{config.bloquesParaReceso}</strong> bloques.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" className="text-green-800 hover:bg-green-100" onClick={() => { setPreview([]); onPreviewChange([]); }}>Descartar</Button>
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg px-8">
                        <Save className="h-4 w-4 mr-2" /> Guardar Todo
                    </Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}