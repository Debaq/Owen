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

import { Carrera, Nivel, Asignatura } from '@/shared/types/models';
import {
  getCarreras,
  getNiveles,
  getAsignaturas,
  createAsignatura,
  updateAsignatura,
  deleteAsignatura,
} from '../services/settingsService';

const formSchema = z.object({
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  horas_semanales: z.coerce.number().min(1, 'Debe tener al menos 1 hora semanal'),
  carrera_id: z.string().min(1, 'Debe seleccionar una carrera'),
  nivel_id: z.string().min(1, 'Debe seleccionar un nivel'),
});

export function AsignaturaManager() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  
  const [selectedCarreraId, setSelectedCarreraId] = useState<string>('');
  const [selectedNivelId, setSelectedNivelId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsignatura, setEditingAsignatura] = useState<Asignatura | null>(null);

  // Form handling
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      horas_semanales: 4,
      carrera_id: '',
      nivel_id: '',
    },
  });

  // Watch fields to update dependent dropdowns in form
  const formCarreraId = form.watch('carrera_id');

  // Load Carreras on mount
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

  // Load Niveles when selectedCarreraId changes (for filters)
  useEffect(() => {
    const loadNiveles = async () => {
      if (!selectedCarreraId) {
        setNiveles([]);
        return;
      }
      try {
        const data = await getNiveles(selectedCarreraId);
        setNiveles(data);
        // Reset selected nivel or pick first one
        if (data.length > 0) {
           setSelectedNivelId(data[0].id);
        } else {
           setSelectedNivelId('');
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadNiveles();
  }, [selectedCarreraId]);

  // Load Asignaturas when selectedNivelId changes
  const fetchAsignaturas = async (nivelId: string) => {
    if (!nivelId) {
      setAsignaturas([]);
      return;
    }
    try {
      setIsLoading(true);
      const data = await getAsignaturas(nivelId);
      setAsignaturas(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar asignaturas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsignaturas(selectedNivelId);
  }, [selectedNivelId]);

  // Load Niveles for the FORM when Form Carrera changes (independent of filters)
  const [formNiveles, setFormNiveles] = useState<Nivel[]>([]);
  useEffect(() => {
    const loadFormNiveles = async () => {
      if (formCarreraId) {
        if (formCarreraId === selectedCarreraId && niveles.length > 0) {
           setFormNiveles(niveles);
           return;
        }
        const data = await getNiveles(formCarreraId);
        setFormNiveles(data);
      } else {
        setFormNiveles([]);
      }
    };
    loadFormNiveles();
  }, [formCarreraId, selectedCarreraId, niveles]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (import.meta.env.DEV) console.log("Submitting form with values:", values);
    try {
      if (editingAsignatura) {
        await updateAsignatura(editingAsignatura.id, values);
        toast.success('Asignatura actualizada correctamente');
      } else {
        await createAsignatura(values);
        toast.success('Asignatura creada correctamente');
      }
      setIsDialogOpen(false);
      form.reset({
        code: '',
        name: '',
        horas_semanales: 4,
        carrera_id: selectedCarreraId,
        nivel_id: selectedNivelId,
      });
      setEditingAsignatura(null);
      fetchAsignaturas(selectedNivelId); // Refresh list
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error('Error al guardar asignatura');
    }
  };

  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
    toast.error('Revise los campos requeridos');
  };

  const handleEdit = (asignatura: Asignatura) => {
    setEditingAsignatura(asignatura);
    if (asignatura.carrera_id === selectedCarreraId && niveles.length > 0) {
        setFormNiveles(niveles);
    }
    form.reset({
      code: asignatura.code,
      name: asignatura.name,
      horas_semanales: asignatura.horas_semanales,
      carrera_id: asignatura.carrera_id,
      nivel_id: asignatura.nivel_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAsignatura(id);
      toast.success('Asignatura eliminada correctamente');
      fetchAsignaturas(selectedNivelId);
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar asignatura');
    }
  };

  const openNewDialog = () => {
    setEditingAsignatura(null);
    if (selectedCarreraId && niveles.length > 0) {
        setFormNiveles(niveles);
    }
    form.reset({
      code: '',
      name: '',
      horas_semanales: 4,
      carrera_id: selectedCarreraId,
      nivel_id: selectedNivelId,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Select
            value={selectedCarreraId}
            onValueChange={setSelectedCarreraId}
          >
            <SelectTrigger className="w-[250px]">
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
          
          <Select
            value={selectedNivelId}
            onValueChange={setSelectedNivelId}
            disabled={!selectedCarreraId || niveles.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar nivel" />
            </SelectTrigger>
            <SelectContent>
              {niveles.map((nivel) => (
                <SelectItem key={nivel.id} value={nivel.id}>
                  {nivel.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} disabled={!selectedNivelId}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Asignatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAsignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="carrera_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrera</FormLabel>
                      <Select
                        onValueChange={(val) => {
                           field.onChange(val);
                           form.setValue('nivel_id', ''); // Reset dependent
                        }}
                        value={field.value}
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
                  name="nivel_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!formCarreraId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar nivel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formNiveles.map((nivel) => (
                            <SelectItem key={nivel.id} value={nivel.id}>
                              {nivel.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="MAT101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="horas_semanales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horas Semanales</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Asignatura</FormLabel>
                      <FormControl>
                        <Input placeholder="Matemáticas I" {...field} />
                      </FormControl>
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
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : asignaturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  {selectedNivelId 
                    ? 'No hay asignaturas para este nivel' 
                    : 'Seleccione Carrera y Nivel'}
                </TableCell>
              </TableRow>
            ) : (
              asignaturas.map((asignatura) => (
                <TableRow key={asignatura.id}>
                  <TableCell className="font-mono">{asignatura.code}</TableCell>
                  <TableCell className="font-medium">{asignatura.name}</TableCell>
                  <TableCell>{asignatura.horas_semanales}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(asignatura)}
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
                              Esta acción eliminará la asignatura permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(asignatura.id)}
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
