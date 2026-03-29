import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/shared/components/ui/select';
import { Wand2, Save, X, RotateCcw, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { massCreateNiveles } from '@/features/settings/services/settingsService';
import { Nivel } from '@/shared/types/models';
import { Badge } from '@/shared/components/ui/badge';

interface LevelsGeneratorProps {
  carreraId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type PlanType = 'semestral' | 'anual' | 'trimestral';

export function LevelsGenerator({ carreraId, onSuccess, onCancel }: LevelsGeneratorProps) {
  const [config, setConfig] = useState({
    tipo: 'semestral' as PlanType,
    cantidad: 10,
    prefijo: ''
  });

  const [preview, setPreview] = useState<Partial<Nivel>[]>([]);

  const generatePreview = () => {
    const levels: Partial<Nivel>[] = [];
    
    for (let i = 1; i <= config.cantidad; i++) {
      let nombre = '';
      let semestre: 'par' | 'impar' | 'anual' = 'impar';

      if (config.tipo === 'semestral') {
        nombre = `${i}° Semestre`;
        semestre = i % 2 === 0 ? 'par' : 'impar';
      } else if (config.tipo === 'anual') {
        nombre = `${i}° Año`;
        semestre = 'anual';
      } else if (config.tipo === 'trimestral') {
        nombre = `${i}° Trimestre`;
        semestre = 'impar'; // Por defecto
      }

      if (config.prefijo) {
        nombre = `${config.prefijo} - ${nombre}`;
      }

      levels.push({
        nombre,
        orden: i,
        semestre
      });
    }
    setPreview(levels);
  };

  const handleSave = async () => {
    if (preview.length === 0) return;
    try {
      if (import.meta.env.DEV) console.log('Guardando plan masivo para carrera:', carreraId);
      await massCreateNiveles(carreraId, preview);
      toast.success('¡Plan de estudios generado correctamente!');
      onSuccess();
    } catch (error) {
      console.error('Error al guardar plan masivo:', error);
      toast.error('Error al guardar el plan');
    }
  };

  return (
    <div className="space-y-6 bg-blue-50/50 p-6 rounded-xl border-2 border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center justify-between border-b border-blue-100 pb-4">
        <div className="flex items-center gap-2 text-blue-700">
            <Wand2 className="h-5 w-5" />
            <h3 className="font-bold uppercase tracking-widest text-sm">Generador de Malla Académica</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Régimen</Label>
            <Select 
                value={config.tipo} 
                onValueChange={(val: PlanType) => setConfig({...config, tipo: val, cantidad: val === 'anual' ? 5 : 10})}
            >
                <SelectTrigger className="bg-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="semestral">Semestral (Par/Impar)</SelectItem>
                    <SelectItem value="anual">Anual (Años)</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cantidad de Niveles</Label>
            <Input 
                type="number" 
                value={config.cantidad} 
                onChange={e => setConfig({...config, cantidad: parseInt(e.target.value) || 0})} 
                className="bg-white"
            />
        </div>

        <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Prefijo (Opcional)</Label>
            <Input 
                placeholder="Ej: Nivel" 
                value={config.prefijo} 
                onChange={e => setConfig({...config, prefijo: e.target.value})} 
                className="bg-white"
            />
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={generatePreview} variant="outline" className="px-12 border-blue-200 text-blue-700 hover:bg-blue-100 bg-white shadow-sm">
            <RotateCcw className="h-4 w-4 mr-2" /> Previsualizar Malla
        </Button>
      </div>

      {preview.length > 0 && (
        <div className="space-y-4 border-t border-blue-100 pt-6 animate-in zoom-in-95">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-tighter">
            <ListChecks className="h-4 w-4" />
            Vista Previa de Niveles
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border shadow-inner">
            {preview.map((n, i) => (
                <div key={i} className="p-2 border rounded bg-muted/30 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-primary">{n.orden}°</span>
                    <span className="text-[11px] font-medium truncate w-full">{n.nombre}</span>
                    <Badge variant="outline" className="text-[8px] h-3 px-1 mt-1 uppercase">{n.semestre}</Badge>
                </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPreview([])}>Limpiar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 shadow-lg px-8">
              <Save className="h-4 w-4 mr-2" /> Crear Plan Completo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
