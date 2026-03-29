import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
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
import { Badge } from '@/shared/components/ui/badge';
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

import { Carrera, Docente } from '@/shared/types/models';
import {
  getCarreras,
  getDocentes,
  createDocente,
  updateDocente,
  deleteDocente,
  activateDocente,
} from '../services/settingsService';

const formSchema = z.object({
  rut: z.string().min(8, 'RUT inválido'),
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  carreras: z.array(z.string()).default([]),
});

export function DocenteManager() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      rut: '',
      name: '',
      email: '',
      telefono: '',
      carreras: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [carrerasData, docentesData] = await Promise.all([
          getCarreras(),
          getDocentes(showInactive ? undefined : true),
        ]);
        setCarreras(carrerasData);
        setDocentes(docentesData);
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [showInactive]);

  const fetchDocentes = async () => {
    try {
      setIsLoading(true);
      const data = await getDocentes(showInactive ? undefined : true);
      setDocentes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingDocente) {
        await updateDocente(editingDocente.id, values);
        toast.success('Docente actualizado');
      } else {
        await createDocente(values);
        toast.success('Docente creado');
      }
      setIsDialogOpen(false);
      form.reset({
        rut: '',
        name: '',
        email: '',
        telefono: '',
        carreras: [],
      });
      setEditingDocente(null);
      fetchDocentes();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar docente');
    }
  };

  const handleEdit = (docente: Docente) => {
    setEditingDocente(docente);
    form.reset({
      rut: docente.rut,
      name: docente.name,
      email: docente.email,
      telefono: docente.telefono || '',
      carreras: docente.carreras || [],
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (docente: Docente) => {
    try {
      if (docente.activo) {
        await deleteDocente(docente.id);
        toast.success('Docente desactivado');
      } else {
        await activateDocente(docente.id);
        toast.success('Docente activado');
      }
      fetchDocentes();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar estado');
    }
  };

  const openNewDialog = () => {
    setEditingDocente(null);
    form.reset({
      rut: '',
      name: '',
      email: '',
      telefono: '',
      carreras: [],
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Docentes</h2>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-600">
              Mostrar inactivos
            </label>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Docente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingDocente ? 'Editar Docente' : 'Nuevo Docente'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUT</FormLabel>
                        <FormControl>
                          <Input placeholder="12.345.678-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+569..." {...field} />
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
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="juan.perez@u.cl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carreras"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Carreras Asociadas</FormLabel>
                        <FormDescription>
                          Seleccione las carreras donde imparte clases.
                        </FormDescription>
                      </div>
                      <div className="h-[150px] w-full rounded-md border p-4 overflow-y-auto">
                        {carreras.map((carrera) => (
                          <FormField
                            key={carrera.id}
                            control={form.control}
                            name="carreras"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={carrera.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 mb-2"
                                >
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value?.includes(carrera.id)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        return checked
                                          ? field.onChange([...field.value, carrera.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== carrera.id
                                              )
                                            );
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {carrera.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
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
              <TableHead>RUT</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Carreras</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : docentes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No hay docentes registrados
                </TableCell>
              </TableRow>
            ) : (
              docentes.map((docente) => (
                <TableRow key={docente.id} className={!docente.activo ? 'opacity-60 bg-gray-50' : ''}>
                  <TableCell className="font-mono text-sm">{docente.rut}</TableCell>
                  <TableCell className="font-medium">{docente.name}</TableCell>
                  <TableCell>{docente.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {docente.carreras?.map(cid => {
                        const c = carreras.find(c => c.id === cid);
                        return c ? (
                          <Badge key={cid} variant="secondary" className="text-xs">
                            {c.code}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {docente.activo ? (
                      <Badge variant="default" className="bg-green-600">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(docente)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {docente.activo ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Desactivar Docente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                El docente no podrá ser asignado a nuevos horarios, pero el historial se mantendrá.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleToggleActive(docente)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Desactivar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleToggleActive(docente)}
                          title="Reactivar"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
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

