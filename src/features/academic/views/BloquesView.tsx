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
  Trash,
  X as XIcon,
  CalendarDays
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
  deleteSistemaBloque,
  getBloques,
  createBloque,
  updateBloque,
  deleteBloque,
  deleteBloquesByDay
} from '@/features/settings/services/settingsService';
import { api } from '@/shared/lib/api';
import type { ApiResponse } from '@/shared/types';

import { MassGenerator } from '../components/MassGenerator';

interface Temporada {
  id: string
  nombre: string
  tipo: string
  año: number
  fecha_inicio: string
  fecha_fin: string
  sistema_bloque_id?: string
  activa: boolean
}

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

  // Temporadas
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [isTemporadaOpen, setIsTemporadaOpen] = useState(false);
  const [newTemp, setNewTemp] = useState({ nombre: '', tipo: 'impar', año: new Date().getFullYear(), fecha_inicio: '', fecha_fin: '', sistema_bloque_id: '', activa: false });

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

  const fetchTemporadas = async () => {
    try {
      const res = await api.get<ApiResponse<Temporada[]>>('/temporadas.php');
      setTemporadas(res.data.data || []);
    } catch { setTemporadas([]); }
  };

  const handleDeleteSistema = async (sys: SistemaBloque) => {
    const usedByTemp = temporadas.find(t => t.sistema_bloque_id === sys.id);
    if (usedByTemp) {
      toast.error(`No se puede eliminar: lo usa la temporada "${usedByTemp.nombre}"`);
      return;
    }
    if (!confirm(`¿Eliminar el sistema "${sys.nombre}" y todos sus bloques?`)) return;
    try {
      await deleteSistemaBloque(sys.id);
      toast.success('Sistema eliminado');
      if (selectedSistema?.id === sys.id) setSelectedSistema(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleCreateTemporada = async () => {
    if (!newTemp.nombre || !newTemp.fecha_inicio || !newTemp.fecha_fin) {
      toast.error('Nombre, fecha inicio y fecha fin son requeridos');
      return;
    }
    try {
      await api.post('/temporadas.php?action=create', {
        ...newTemp,
        sistema_bloque_id: newTemp.sistema_bloque_id || null,
        activa: newTemp.activa ? 1 : 0,
      });
      toast.success('Temporada creada');
      setNewTemp({ nombre: '', tipo: 'impar', año: new Date().getFullYear(), fecha_inicio: '', fecha_fin: '', sistema_bloque_id: '', activa: false });
      fetchTemporadas();
    } catch {
      toast.error('Error al crear temporada');
    }
  };

  const handleToggleActiva = async (temp: Temporada) => {
    try {
      await api.post(`/temporadas.php?action=update&id=${temp.id}`, { activa: !temp.activa ? 1 : 0 });
      toast.success(temp.activa ? 'Temporada desactivada' : 'Temporada activada');
      fetchTemporadas();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleUpdateTemporadaSistema = async (temp: Temporada, sistemaId: string) => {
    try {
      await api.post(`/temporadas.php?action=update&id=${temp.id}`, { sistema_bloque_id: sistemaId || null });
      toast.success('Sistema de bloques actualizado');
      fetchTemporadas();
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleDeleteTemporada = async (temp: Temporada) => {
    if (temp.activa) {
      toast.error('No se puede eliminar una temporada activa');
      return;
    }
    if (!confirm(`¿Eliminar la temporada "${temp.nombre}"?`)) return;
    try {
      await api.post(`/temporadas.php?action=delete&id=${temp.id}`);
      toast.success('Temporada eliminada');
      fetchTemporadas();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  useEffect(() => { fetchData(); fetchTemporadas(); }, []);
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
              <div key={sys.id} className="group relative">
                <button
                  onClick={() => setSelectedSistema(sys)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all pr-8 ${
                    selectedSistema?.id === sys.id
                      ? 'bg-white text-primary font-bold shadow-sm border-l-4 border-l-primary'
                      : 'hover:bg-muted text-foreground/70'
                  }`}
                >
                  <span className="md:hidden flex justify-center uppercase font-bold">{sys.nombre.substring(0, 2)}</span>
                  <span className="hidden md:block truncate">{sys.nombre}</span>
                </button>
                {!sys.es_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSistema(sys); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Eliminar sistema"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
                <Button variant="outline" className="h-10" onClick={() => setIsTemporadaOpen(true)}>
                  <CalendarDays className="mr-2 h-4 w-4" /> Temporadas
                </Button>
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

      {/* Modal Temporadas */}
      <Dialog open={isTemporadaOpen} onOpenChange={setIsTemporadaOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Temporadas</DialogTitle>
            <DialogDescription>
              Cada temporada (semestre) usa un sistema de bloques. La temporada activa determina qué horarios y bloques se muestran en el sistema.
            </DialogDescription>
          </DialogHeader>

          {/* Lista de temporadas existentes */}
          <div className="space-y-2">
            {temporadas.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay temporadas registradas</p>
            ) : (
              temporadas.map(temp => (
                <div key={temp.id} className={`flex items-center gap-3 p-3 rounded-lg border ${temp.activa ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{temp.nombre}</span>
                      {temp.activa && (
                        <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">Activa</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {temp.tipo === 'par' ? 'Semestre Par' : 'Semestre Impar'} {temp.año} — {temp.fecha_inicio} a {temp.fecha_fin}
                    </div>
                  </div>

                  {/* Selector de sistema de bloques */}
                  <div className="w-44 flex-shrink-0">
                    <Select
                      value={temp.sistema_bloque_id || '_none'}
                      onValueChange={v => handleUpdateTemporadaSistema(temp, v === '_none' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sin sistema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sin sistema</SelectItem>
                        {sistemas.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant={temp.activa ? 'outline' : 'default'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleToggleActiva(temp)}
                    >
                      {temp.activa ? 'Desactivar' : 'Activar'}
                    </Button>
                    {!temp.activa && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteTemporada(temp)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Formulario nueva temporada */}
          <div className="border-t pt-4 mt-2 space-y-3">
            <h4 className="font-semibold text-sm">Nueva Temporada</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre *</Label>
                <Input
                  value={newTemp.nombre}
                  onChange={e => setNewTemp(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: 1er Semestre 2026"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={newTemp.tipo} onValueChange={v => setNewTemp(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="impar">Impar (1°)</SelectItem>
                      <SelectItem value="par">Par (2°)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Año</Label>
                  <Input
                    type="number"
                    value={newTemp.año}
                    onChange={e => setNewTemp(p => ({ ...p, año: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha inicio *</Label>
                <Input
                  type="date"
                  value={newTemp.fecha_inicio}
                  onChange={e => setNewTemp(p => ({ ...p, fecha_inicio: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha fin *</Label>
                <Input
                  type="date"
                  value={newTemp.fecha_fin}
                  onChange={e => setNewTemp(p => ({ ...p, fecha_fin: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sistema de bloques</Label>
                <Select value={newTemp.sistema_bloque_id || '_none'} onValueChange={v => setNewTemp(p => ({ ...p, sistema_bloque_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin sistema</SelectItem>
                    {sistemas.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateTemporada} className="h-8 text-xs w-full">
                  <Plus className="h-3 w-3 mr-1" /> Crear Temporada
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
