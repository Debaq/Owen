import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  BookOpen, 
  Microscope, 
  Clock, 
  Users, 
  UserPlus, 
  X,
  ShieldCheck,
  User
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Separator } from '@/shared/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

import { Nivel, Asignatura, Docente } from '@/shared/types/models';
import {
  getNiveles,
  getAsignaturas,
  createAsignatura,
  updateAsignatura,
  deleteAsignatura,
  getDocentes,
  getDocentesAsignatura,
  assignDocenteAsignatura,
  unassignDocenteAsignatura,
  DocenteAsignatura
} from '@/features/settings/services/settingsService';

const formSchema = z.object({
  code: z.string().min(2, 'Mínimo 2 caracteres'),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  nivel_id: z.string().min(1, 'Requerido'),
  carrera_id: z.string().min(1, 'Error: Falta ID carrera'),
  horas_teoria: z.coerce.number().min(0),
  horas_practica: z.coerce.number().min(0),
  horas_autonomas: z.coerce.number().min(0),
  creditos: z.coerce.number().min(0),
  duracion_semanas: z.coerce.number().min(1).max(52),
  semana_inicio: z.coerce.number().min(1).max(52),
});

interface SubjectTeacherManagerProps {
    asignatura: Asignatura;
    onUpdate?: () => void;
}

function SubjectTeacherManager({ asignatura, onUpdate }: SubjectTeacherManagerProps) {
    const [assigned, setAssigned] = useState<DocenteAsignatura[]>([]);
    const [allDocentes, setAllDocentes] = useState<Docente[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
    const [selectedRol, setSelectedRol] = useState<'responsable' | 'colaborador'>('responsable');

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [assignedData, docentesData] = await Promise.all([
                getDocentesAsignatura(asignatura.id),
                getDocentes(true) // only active
            ]);
            setAssigned(assignedData);
            setAllDocentes(docentesData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [asignatura.id]);

    const handleAssign = async () => {
        if (!selectedDocenteId) return;
        try {
            await assignDocenteAsignatura({
                asignatura_id: asignatura.id,
                docente_id: selectedDocenteId,
                rol: selectedRol
            });
            toast.success('Docente asignado');
            setSelectedDocenteId('');
            loadData();
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error al asignar');
        }
    };

    const handleUnassign = async (id: string) => {
        try {
            await unassignDocenteAsignatura(id);
            toast.success('Docente removido');
            loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al remover');
        }
    };

    return (
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Docentes: {asignatura.name}
                </DialogTitle>
                <DialogDescription>
                    Administre los docentes responsables y colaboradores.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
                <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Select value={selectedDocenteId} onValueChange={setSelectedDocenteId}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Seleccionar docente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allDocentes
                                        .filter(d => !assigned.some(a => a.docente_id === d.id))
                                        .map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <Select value={selectedRol} onValueChange={(v: any) => setSelectedRol(v)}>
                            <SelectTrigger className="w-[140px] bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="responsable">Responsable</SelectItem>
                                <SelectItem value="colaborador">Colaborador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAssign} disabled={!selectedDocenteId} className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" /> Asignar a Asignatura
                    </Button>
                </div>

                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        Personal Asignado
                        <Badge variant="secondary" className="text-[9px]">{assigned.length}</Badge>
                    </h4>
                    <ScrollArea className="h-[200px] pr-4">
                        {isLoading ? (
                            <p className="text-center py-4 text-sm text-muted-foreground italic">Cargando...</p>
                        ) : assigned.length === 0 ? (
                            <p className="text-center py-8 text-sm text-muted-foreground italic border-2 border-dashed rounded-lg">
                                No hay docentes asignados.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {assigned.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm group">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${a.rol === 'responsable' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                {a.rol === 'responsable' ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold leading-none">{a.docente_name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase mt-1">{a.rol}</span>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleUnassign(a.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </DialogContent>
    );
}

interface SubjectsListProps {
  carreraId: string;
}

export function SubjectsList({ carreraId }: SubjectsListProps) {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [selectedNivelId, setSelectedNivelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsignatura, setEditingAsignatura] = useState<Asignatura | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      nivel_id: '',
      carrera_id: carreraId,
      horas_teoria: 2,
      horas_practica: 2,
      horas_autonomas: 4,
      creditos: 5,
      duracion_semanas: 17,
      semana_inicio: 1,
    },
  });

  useEffect(() => {
    form.setValue('carrera_id', carreraId);
  }, [carreraId, form]);

  useEffect(() => {
    const loadNiveles = async () => {
      if (!carreraId) return;
      try {
        const data = await getNiveles(carreraId);
        setNiveles(data);
        if (data.length > 0 && !selectedNivelId) setSelectedNivelId(data[0].id);
      } catch (error) { console.error(error); }
    };
    loadNiveles();
  }, [carreraId]);

  const fetchAsignaturas = async (nivelId: string) => {
    if (!nivelId) { setAsignaturas([]); return; }
    try {
      setIsLoading(true);
      const data = await getAsignaturas(nivelId);
      setAsignaturas(data);
    } catch (error) { toast.error('Error al cargar asignaturas'); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAsignaturas(selectedNivelId); }, [selectedNivelId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (import.meta.env.DEV) console.log("Submitting SubjectsList form:", values);
    try {
      // Auto-calcular horas semanales presenciales
      const horas_semanales = Number(values.horas_teoria) + Number(values.horas_practica);
      const payload = { ...values, horas_semanales };

      if (editingAsignatura) {
        await updateAsignatura(editingAsignatura.id, payload as any);
        toast.success('Asignatura actualizada');
      } else {
        await createAsignatura(payload as any);
        toast.success('Asignatura creada');
      }
      setIsDialogOpen(false);
      // Reset keeping the context
      form.reset({
        code: '',
        name: '',
        nivel_id: selectedNivelId,
        carrera_id: carreraId,
        horas_teoria: 2,
        horas_practica: 2,
        horas_autonomas: 4,
        creditos: 5,
        duracion_semanas: 17,
        semana_inicio: 1,
      });
      setEditingAsignatura(null);
      fetchAsignaturas(selectedNivelId);
    } catch (error) { 
        console.error("Error saving subject:", error);
        toast.error('Error al guardar'); 
    }
  };

  const onError = (errors: any) => {
    console.error("Validation errors:", errors);
    toast.error('Revise los campos requeridos');
  };

  const handleEdit = (asig: Asignatura) => {
    setEditingAsignatura(asig);
    form.reset({
      code: asig.code,
      name: asig.name,
      nivel_id: asig.nivel_id,
      carrera_id: asig.carrera_id,
      horas_teoria: asig.horas_teoria,
      horas_practica: asig.horas_practica,
      horas_autonomas: asig.horas_autonomas,
      creditos: asig.creditos,
      duracion_semanas: asig.duracion_semanas,
      semana_inicio: asig.semana_inicio,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAsignatura(id);
      toast.success('Eliminada');
      fetchAsignaturas(selectedNivelId);
    } catch (error) { toast.error('Error al eliminar'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-xl border border-dashed">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tighter">Malla de Asignaturas</h3>
          <Select value={selectedNivelId} onValueChange={setSelectedNivelId}>
            <SelectTrigger className="w-[220px] bg-white shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{niveles.map(n => <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { 
              setEditingAsignatura(null); 
              form.reset({
                code: '',
                name: '',
                nivel_id: selectedNivelId,
                carrera_id: carreraId,
                horas_teoria: 2,
                horas_practica: 2,
                horas_autonomas: 4,
                creditos: 5,
                duracion_semanas: 17,
                semana_inicio: 1,
              }); 
            }} disabled={!selectedNivelId}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Asignatura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAsignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}</DialogTitle>
              <DialogDescription>Configure los créditos y la carga horaria.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="code" render={({ field }) => (
                        <FormItem><FormLabel>Código</FormLabel><FormControl><Input placeholder="MAT101" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="creditos" render={({ field }) => (
                        <FormItem><FormLabel>Créditos (SCT)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre de Asignatura</FormLabel><FormControl><Input placeholder="Ej: Introducción a la Ingeniería" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="horas_teoria" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Teoría</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="horas_practica" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1"><Microscope className="h-3 w-3" /> Práctica</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="horas_autonomas" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1"><Clock className="h-3 w-3" /> Autónoma</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                    <FormField control={form.control} name="duracion_semanas" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs uppercase font-bold">Duración (Semanas)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription className="text-[10px]">Normal: 17 semanas.</FormDescription></FormItem>
                    )} />
                    <FormField control={form.control} name="semana_inicio" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs uppercase font-bold">Semana Inicio</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription className="text-[10px]">Normal: Semana 1.</FormDescription></FormItem>
                    )} />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Guardar Asignatura</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Asignatura</TableHead>
              <TableHead className="text-center">T - P - A</TableHead>
              <TableHead className="text-center">Docentes</TableHead>
              <TableHead className="text-center">SCT</TableHead>
              <TableHead className="text-center">Régimen</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : asignaturas.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">No hay asignaturas en este nivel.</TableCell></TableRow>
            ) : (
              asignaturas.map((asig) => (
                <TableRow key={asig.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell className="font-mono text-xs font-bold">{asig.code}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">{asig.name}</span>
                        <span className="text-[10px] text-muted-foreground">Total Presencial: {asig.horas_semanales} hrs</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className="text-[10px] h-5">{asig.horas_teoria}</Badge>
                        <Badge variant="outline" className="text-[10px] h-5 bg-blue-50">{asig.horas_practica}</Badge>
                        <Badge variant="outline" className="text-[10px] h-5 bg-green-50">{asig.horas_autonomas}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className={`h-8 px-2 flex items-center gap-2 ${asig.docente_count === 0 ? 'text-destructive bg-destructive/10 hover:bg-destructive/20' : 'text-primary'}`}>
                                    <Users className="h-4 w-4" />
                                    <span className="font-bold">{asig.docente_count}</span>
                                </Button>
                            </DialogTrigger>
                            <SubjectTeacherManager asignatura={asig} onUpdate={() => fetchAsignaturas(selectedNivelId)} />
                        </Dialog>
                        {asig.docente_count === 0 && (
                            <Badge variant="destructive" className="animate-pulse px-1 h-4"><Plus className="h-3 w-3" /></Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">{asig.creditos}</TableCell>
                  <TableCell className="text-center">
                    {asig.duracion_semanas < 17 ? (
                        <div className="flex flex-col items-center">
                            <Badge variant="destructive" className="text-[8px] h-4 uppercase">Modular</Badge>
                            <span className="text-[9px] text-muted-foreground">Sem {asig.semana_inicio} a {asig.semana_inicio + asig.duracion_semanas - 1}</span>
                        </div>
                    ) : (
                        <Badge variant="secondary" className="text-[8px] h-4 uppercase">Semestral</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(asig)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(asig.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}