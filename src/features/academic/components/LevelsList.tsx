import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Wand2 } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';

import { Nivel } from '@/shared/types/models';
import {
  getNiveles,
  createNivel,
  updateNivel,
  deleteNivel,
} from '@/features/settings/services/settingsService';

import { LevelsGenerator } from './LevelsGenerator';

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  orden: z.coerce.number().min(1, 'El orden debe ser mayor a 0'),
  semestre: z.enum(['par', 'impar', 'anual']),
  carrera_id: z.string().min(1, 'Error interno: Falta ID carrera'),
});

interface LevelsListProps {
  carreraId: string;
}

export function LevelsList({ carreraId }: LevelsListProps) {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNivel, setEditingNivel] = useState<Nivel | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<'todos' | 'par' | 'impar' | 'anual'>('todos');
  const [showGenerator, setShowGenerator] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nombre: '',
      orden: 1,
      semestre: 'impar',
      carrera_id: carreraId,
    },
  });

  useEffect(() => {
    form.setValue('carrera_id', carreraId);
  }, [carreraId, form]);

  const fetchNiveles = async () => {
    if (!carreraId) return;
    try {
      setIsLoading(true);
      const data = await getNiveles(carreraId);
      setNiveles(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar niveles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNiveles();
  }, [carreraId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingNivel) {
        await updateNivel(editingNivel.id, values);
        toast.success('Nivel actualizado');
      } else {
        await createNivel(values);
        toast.success('Nivel creado');
      }
      setIsDialogOpen(false);
      form.reset({
        nombre: '',
        orden: niveles.length + 1,
        semestre: values.semestre,
        carrera_id: carreraId,
      });
      setEditingNivel(null);
      fetchNiveles();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar nivel');
    }
  };

  const handleEdit = (nivel: Nivel) => {
    setEditingNivel(nivel);
    form.reset({
      nombre: nivel.nombre,
      orden: nivel.orden,
      semestre: nivel.semestre,
      carrera_id: nivel.carrera_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNivel(id);
      toast.success('Nivel eliminado');
      fetchNiveles();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar nivel');
    }
  };

  const openNewDialog = () => {
    setEditingNivel(null);
    form.reset({
      nombre: '',
      orden: niveles.length + 1,
      semestre: semesterFilter === 'todos' ? 'impar' : semesterFilter,
      carrera_id: carreraId,
    });
    setIsDialogOpen(true);
  };

  const filteredNiveles = niveles.filter(n => 
    semesterFilter === 'todos' ? true : n.semestre === semesterFilter
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-xl border border-dashed">
        <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-primary uppercase tracking-tighter">Niveles de Carrera</h3>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border shadow-sm">
                <Button 
                    variant={semesterFilter === 'todos' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-[10px] px-2 uppercase font-bold"
                    onClick={() => setSemesterFilter('todos')}
                >
                    Todos
                </Button>
                <Button 
                    variant={semesterFilter === 'impar' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-[10px] px-2 uppercase font-bold"
                    onClick={() => setSemesterFilter('impar')}
                >
                    Impar
                </Button>
                <Button 
                    variant={semesterFilter === 'par' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-[10px] px-2 uppercase font-bold"
                    onClick={() => setSemesterFilter('par')}
                >
                    Par
                </Button>
                <Button 
                    variant={semesterFilter === 'anual' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-[10px] px-2 uppercase font-bold"
                    onClick={() => setSemesterFilter('anual')}
                >
                    Anual
                </Button>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] uppercase font-bold border-blue-200 text-blue-700"
                onClick={() => setShowGenerator(!showGenerator)}
            >
                <Wand2 className="h-3 w-3 mr-1" /> Generar Plan
            </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} size="sm" className="shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Agregar Nivel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNivel ? 'Editar Nivel' : 'Nuevo Nivel'}
              </DialogTitle>
              <DialogDescription>Defina el año o semestre académico.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 1er Semestre o 1er Año" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="orden"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Orden</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="semestre"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Temporalidad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="impar">Impar (1, 3, 5...)</SelectItem>
                                <SelectItem value="par">Par (2, 4, 6...)</SelectItem>
                                <SelectItem value="anual">Anual (Todo el año)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {showGenerator && (
        <LevelsGenerator 
            carreraId={carreraId}
            onSuccess={() => { 
                setSemesterFilter('todos');
                fetchNiveles(); 
                setShowGenerator(false); 
            }}
            onCancel={() => setShowGenerator(false)}
        />
      )}

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[80px]">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Temporalidad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredNiveles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                  No hay niveles registrados.
                </TableCell>
              </TableRow>
            ) : (
              filteredNiveles.map((nivel) => (
                <TableRow key={nivel.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell className="font-mono text-xs">{nivel.orden}</TableCell>
                  <TableCell className="font-bold">{nivel.nombre}</TableCell>
                  <TableCell>
                    <Badge 
                        variant={nivel.semestre === 'anual' ? 'default' : (nivel.semestre === 'impar' ? 'outline' : 'secondary')} 
                        className={`uppercase text-[9px] font-black tracking-widest ${nivel.semestre === 'anual' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                    >
                        {nivel.semestre}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(nivel)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar nivel?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el nivel permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(nivel.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
