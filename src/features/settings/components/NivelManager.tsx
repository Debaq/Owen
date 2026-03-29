import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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

import { Carrera, Nivel } from '@/shared/types/models';
import {
  getCarreras,
  getNiveles,
  createNivel,
  updateNivel,
  deleteNivel,
} from '../services/settingsService';

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  orden: z.coerce.number().min(1, 'El orden debe ser mayor a 0'),
  carrera_id: z.string().min(1, 'Debe seleccionar una carrera'),
});

export function NivelManager() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [selectedCarreraId, setSelectedCarreraId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNivel, setEditingNivel] = useState<Nivel | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nombre: '',
      orden: 1,
      carrera_id: '',
    },
  });

  useEffect(() => {
    const loadCarreras = async () => {
      try {
        const data = await getCarreras();
        setCarreras(data);
        if (data.length > 0) {
          setSelectedCarreraId(data[0].id);
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar carreras');
      }
    };
    loadCarreras();
  }, []);

  const fetchNiveles = async (carreraId: string) => {
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
    if (selectedCarreraId) {
      fetchNiveles(selectedCarreraId);
      form.setValue('carrera_id', selectedCarreraId);
    }
  }, [selectedCarreraId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingNivel) {
        await updateNivel(editingNivel.id, values);
        toast.success('Nivel actualizado correctamente');
      } else {
        await createNivel(values);
        toast.success('Nivel creado correctamente');
      }
      setIsDialogOpen(false);
      form.reset({
        nombre: '',
        orden: niveles.length + 1,
        carrera_id: selectedCarreraId,
      });
      setEditingNivel(null);
      fetchNiveles(selectedCarreraId);
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
      carrera_id: nivel.carrera_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNivel(id);
      toast.success('Nivel eliminado correctamente');
      fetchNiveles(selectedCarreraId);
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
      carrera_id: selectedCarreraId,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Niveles</h2>
          <Select
            value={selectedCarreraId}
            onValueChange={setSelectedCarreraId}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Seleccionar carrera" />
            </SelectTrigger>
            <SelectContent>
              {carreras.map((carrera) => (
                <SelectItem key={carrera.id} value={carrera.id}>
                  {carrera.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} disabled={!selectedCarreraId}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Nivel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNivel ? 'Editar Nivel' : 'Nuevo Nivel'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="carrera_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrera</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled // Always locked to current selection
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar carrera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {carreras.map((carrera) => (
                            <SelectItem key={carrera.id} value={carrera.id}>
                              {carrera.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="1er Semestre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orden"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orden</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número para ordenar visualmente (1, 2, 3...)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : niveles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  {selectedCarreraId 
                    ? 'No hay niveles registrados para esta carrera' 
                    : 'Seleccione una carrera para ver sus niveles'}
                </TableCell>
              </TableRow>
            ) : (
              niveles.map((nivel) => (
                <TableRow key={nivel.id}>
                  <TableCell>{nivel.orden}</TableCell>
                  <TableCell className="font-medium">{nivel.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(nivel)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
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
