import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  Wand2,
  Trash
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import { BloqueHorario, SistemaBloque } from '@/shared/types/models';
import {
  getSistemasBloques,
  createSistemaBloque,
  getBloques,
  createBloque,
  updateBloque,
  deleteBloque,
  deleteBloquesByDay
} from '@/features/settings/services/settingsService';

import { MassGenerator } from '../components/MassGenerator';

const blockFormSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  hora_inicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  hora_fin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  dia_semana: z.coerce.number().min(1).max(7),
  orden: z.coerce.number().min(0),
});

const ALL_DIAS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 7, label: 'Domingo' },
];

export default function BloquesView() {
  const [sistemas, setSistemas] = useState<SistemaBloque[]>([]);
  const [selectedSistema, setSelectedSistema] = useState<SistemaBloque | null>(null);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [previewBloques, setPreviewBloques] = useState<Partial<BloqueHorario>[]>([]);
  const [enabledDays, setEnabledDays] = useState<number[]>([1, 2, 3, 4, 5]);
  
  const [isSystemCreateOpen, setIsSystemCreateOpen] = useState(false);
  const [isBlockCreateOpen, setIsBlockCreateOpen] = useState(false);
  const [showMassGenerator, setShowMassGenerator] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BloqueHorario | null>(null);
  const [newSystemName, setNewSystemName] = useState('');

  const form = useForm<z.infer<typeof blockFormSchema>>({
    resolver: zodResolver(blockFormSchema) as any,
    defaultValues: {
      nombre: '',
      hora_inicio: '08:30',
      hora_fin: '09:45',
      dia_semana: 1,
      orden: 0,
    },
  });

  const fetchData = async () => {
    try {
      const data = await getSistemasBloques();
      setSistemas(data);
      if (data.length > 0 && !selectedSistema) {
        setSelectedSistema(data[0]);
      }
    } catch (error) {
      toast.error('Error al cargar sistemas');
    }
  };

  const fetchBloques = async (id: string) => {
    try {
      const data = await getBloques(id);
      setBloques(data);
      
      const daysWithData = Array.from(new Set(data.map(b => Number(b.dia_semana))));
      if (daysWithData.length > 0) {
          setEnabledDays(prev => {
              if (prev.length > 0 && prev.some(d => daysWithData.includes(d))) return prev;
              return Array.from(new Set([...daysWithData, 1, 2, 3, 4, 5])).sort();
          });
      }
    } catch (error) {
      toast.error('Error al cargar bloques');
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { 
    if (selectedSistema) {
        fetchBloques(selectedSistema.id);
        setPreviewBloques([]);
    }
  }, [selectedSistema]);

  const handleCreateSystem = async () => {
    if (!newSystemName) return;
    try {
      const newSys = await createSistemaBloque(newSystemName);
      toast.success('Sistema creado');
      setNewSystemName('');
      setIsSystemCreateOpen(false);
      fetchData();
      setSelectedSistema(newSys);
    } catch (error) { toast.error('Error'); }
  };

  const handleBlockSubmit = async (values: z.infer<typeof blockFormSchema>) => {
    if (!selectedSistema) return;
    try {
      if (editingBlock) {
        await updateBloque(editingBlock.id, values);
        toast.success('Bloque actualizado');
      } else {
        await createBloque({ ...values, sistema_bloque_id: selectedSistema.id });
        toast.success('Bloque creado');
      }
      setIsBlockCreateOpen(false);
      fetchBloques(selectedSistema.id);
    } catch (error) { toast.error('Error'); }
  };

  const handleDeleteDay = async (diaId: number) => {
    if (!selectedSistema) return;
    try {
        await deleteBloquesByDay(selectedSistema.id, diaId);
        setEnabledDays(prev => prev.filter(d => d !== diaId));
        fetchBloques(selectedSistema.id);
        toast.success('Día eliminado');
    } catch (error) {
        toast.error('Error al eliminar día');
    }
  };

  const handleAddDay = (diaId: number) => {
    setEnabledDays(prev => [...prev, diaId].sort((a, b) => a - b));
  };

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* Sidebar de Sistemas - Mas cómodo (w-64) */}
      <div className="w-16 md:w-64 border-r bg-muted/10 flex flex-col shrink-0 transition-all">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="hidden md:block font-bold text-xs uppercase tracking-widest text-muted-foreground">Sistemas</h2>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsSystemCreateOpen(true)}><Plus className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1.5">
            {sistemas.map((sys) => (
              <button
                key={sys.id}
                onClick={() => setSelectedSistema(sys)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                  selectedSistema?.id === sys.id 
                    ? 'bg-white text-primary font-bold shadow-sm border-l-4 border-l-primary' 
                    : 'hover:bg-muted text-foreground/70'
                }`}
              >
                <span className="md:hidden flex justify-center uppercase font-bold">{sys.nombre.substring(0, 2)}</span>
                <span className="hidden md:block truncate">{sys.nombre}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content: La Pizarra */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {selectedSistema ? (
          <>
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white shadow-sm z-10">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{selectedSistema.nombre}</h1>
                <p className="text-sm text-muted-foreground mt-1">Gestión integral de la matriz horaria semanal.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="h-10 border-primary/20 text-primary hover:bg-primary/5" onClick={() => setShowMassGenerator(!showMassGenerator)}>
                  <Wand2 className="mr-2 h-4 w-4" /> Generador Masivo
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-8">
                {showMassGenerator && (
                  <MassGenerator 
                    sistemaId={selectedSistema.id} 
                    onPreviewChange={setPreviewBloques}
                    onSuccess={() => { fetchBloques(selectedSistema.id); setShowMassGenerator(false); }}
                    onCancel={() => setShowMassGenerator(false)}
                  />
                )}

                {/* Grid Matriz Semanal - Airy and Large */}
                <div className="flex gap-4 w-full mt-8 min-h-[700px]">
                  {ALL_DIAS.map((dia) => {
                    const isActive = enabledDays.includes(dia.id);
                    const hasActiveNeighbor = enabledDays.includes(dia.id - 1) || enabledDays.includes(dia.id + 1);
                    
                    if (!isActive) {
                        if (hasActiveNeighbor) {
                            return (
                                <div key={dia.id} className="w-12 flex flex-col items-center justify-center gap-4 group animate-in fade-in zoom-in-95">
                                    <div className="h-full w-[2px] bg-muted/50 group-hover:bg-primary/20 transition-colors" />
                                    <Button 
                                        size="icon" 
                                        variant="outline" 
                                        className="rounded-full h-10 w-10 border-dashed border-2 bg-white hover:border-primary hover:text-primary transition-all shadow-sm"
                                        onClick={() => handleAddDay(dia.id)}
                                        title={`Agregar ${dia.label}`}
                                    >
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                    <div className="h-full w-[2px] bg-muted/50 group-hover:bg-primary/20 transition-colors" />
                                </div>
                            );
                        }
                        return null;
                    }

                    const diaActualBloques = bloques.filter(b => Number(b.dia_semana) === dia.id);
                    const diaActualPreview = previewBloques.filter(b => Number(b.dia_semana) === dia.id);

                    return (
                      <div key={dia.id} className="flex-1 min-w-[180px] max-w-none animate-in fade-in slide-in-from-left-2 flex flex-col border rounded-xl overflow-hidden shadow-sm bg-muted/5">
                        {/* Header Unificado */}
                        <div className="bg-white p-3 border-b-2 border-primary flex items-center justify-between px-4">
                          <span className="text-xs font-black uppercase tracking-widest text-primary">{dia.label}</span>
                          <button 
                            onClick={() => handleDeleteDay(dia.id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Cuerpo de la Columna */}
                        <div className="space-y-3 p-3 flex flex-col flex-1 min-h-[600px]">
                          {/* Bloques Reales */}
                          {diaActualBloques
                            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                            .map(b => (
                              <div key={b.id} className="bg-white p-4 rounded-xl border shadow-sm group relative hover:border-primary hover:shadow-md transition-all">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1">{b.nombre}</div>
                                <div className="text-base font-black text-primary tracking-tight leading-none">{b.hora_inicio} — {b.hora_fin}</div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-white/90 backdrop-blur-sm shadow-md rounded-lg border p-1 translate-y-1 group-hover:translate-y-0 transition-all">
                                  <button onClick={() => { setEditingBlock(b); form.reset(b as any); setIsBlockCreateOpen(true); }} className="p-1 hover:bg-blue-50 text-blue-600 rounded"><Pencil className="h-3 w-3" /></button>
                                  <button onClick={() => deleteBloque(b.id).then(() => fetchBloques(selectedSistema.id))} className="p-1 hover:bg-red-50 text-red-600 rounded"><Trash className="h-3 w-3" /></button>
                                </div>
                              </div>
                            ))}

                          {/* Bloques Verdes */}
                          {diaActualPreview.map((b, idx) => (
                            <div key={`preview-${idx}`} className="bg-green-500/10 p-4 rounded-xl border-2 border-dashed border-green-500 animate-pulse">
                                <div className="text-[10px] font-bold text-green-700 uppercase tracking-tight mb-1">{b.nombre}</div>
                                <div className="text-base font-black text-green-800 tracking-tight leading-none">{b.hora_inicio} — {b.hora_fin}</div>
                            </div>
                          ))}

                          <Button 
                              variant="ghost" 
                              className="w-full border-2 border-dashed border-muted-foreground/10 text-muted-foreground/30 hover:text-primary hover:border-primary/20 h-14 mt-auto rounded-xl bg-transparent"
                              onClick={() => { setEditingBlock(null); form.reset({ dia_semana: dia.id, nombre: 'Bloque', hora_inicio: '08:00', hora_fin: '09:00', orden: 0 }); setIsBlockCreateOpen(true); }}
                          >
                              <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground italic">
            <Calendar className="h-16 w-16 mb-4 opacity-5" />
            Seleccione un sistema de horarios para comenzar
          </div>
        )}
      </div>

      {/* Modal Bloque Manual */}
      <Dialog open={isBlockCreateOpen} onOpenChange={setIsBlockCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Editar Bloque' : 'Crear Bloque Manual'}</DialogTitle>
            <DialogDescription>Ajuste el nombre y horario del bloque para este día específico.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleBlockSubmit)} className="space-y-5 pt-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel>Nombre descriptivo</FormLabel><FormControl><Input placeholder="Ej: Bloque 1" {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="hora_inicio" render={({ field }) => (
                  <FormItem><FormLabel>Hora de Inicio</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="hora_fin" render={({ field }) => (
                  <FormItem><FormLabel>Hora de Término</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="dia_semana" render={({ field }) => (
                <FormItem><FormLabel>Día de la semana</FormLabel><Select onValueChange={field.onChange} value={field.value.toString()}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{ALL_DIAS.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.label}</SelectItem>)}</SelectContent>
                </Select></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsBlockCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" className="px-8">Guardar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo Sistema */}
      <Dialog open={isSystemCreateOpen} onOpenChange={setIsSystemCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Sistema de Bloques</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Nombre del Sistema</Label>
                <Input value={newSystemName} onChange={e => setNewSystemName(e.target.value)} placeholder="Ej: Régimen Vespertino" />
            </div>
            <Button onClick={handleCreateSystem} className="w-full h-10 shadow-lg">Crear Sistema</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
