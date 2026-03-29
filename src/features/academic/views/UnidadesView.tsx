import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Search, 
  Building2, 
  ChevronRight,
  UserCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { TeacherCombobox } from '@/shared/components/ui/teacher-combobox';

import { Docente, UnidadAcademica } from '@/shared/types/models';
import {
  getUnidades,
  createUnidad,
  updateUnidad,
  deleteUnidad,
  getDocentes,
} from '@/features/settings/services/settingsService';

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres'),
  tipo: z.enum(['centro', 'instituto', 'vicerrectoria', 'unidad', 'otro']),
  encargado_id: z.string().optional().nullable(),
});

export default function UnidadesView() {
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadAcademica | null>(null);
  const [unitDocentes, setUnitDocentes] = useState<Docente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nombre: '',
      code: '',
      tipo: 'unidad',
      encargado_id: null,
    },
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [uData, dData] = await Promise.all([
        getUnidades(),
        getDocentes(true)
      ]);
      setUnidades(uData);
      setDocentes(dData);
      
      if (selectedUnidad) {
        const updated = uData.find(u => u.id === selectedUnidad.id);
        if (updated) {
            setSelectedUnidad(updated);
            const ud = await getDocentes(undefined, updated.id);
            setUnitDocentes(ud);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const loadUnitDocentes = async () => {
        if (selectedUnidad) {
            const ud = await getDocentes(undefined, selectedUnidad.id);
            setUnitDocentes(ud);
        }
    };
    loadUnitDocentes();
  }, [selectedUnidad]);

  const handleCreate = async (values: z.infer<typeof formSchema>) => {
    try {
      const newUnit = await createUnidad(values as any);
      toast.success('Unidad creada');
      setIsCreateOpen(false);
      form.reset();
      fetchData();
      setSelectedUnidad(newUnit);
    } catch (error) {
      console.error(error);
      toast.error('Error al crear unidad');
    }
  };

  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!selectedUnidad) return;
    try {
      await updateUnidad(selectedUnidad.id, values as any);
      toast.success('Unidad actualizada');
      setIsEditOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar unidad');
    }
  };

  const handleDelete = async () => {
    if (!selectedUnidad) return;
    try {
      await deleteUnidad(selectedUnidad.id);
      toast.success('Unidad eliminada');
      setIsDeleteOpen(false);
      setSelectedUnidad(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar unidad');
    }
  };

  const openEditDialog = () => {
    if (!selectedUnidad) return;
    form.reset({
      nombre: selectedUnidad.nombre,
      code: selectedUnidad.code,
      tipo: selectedUnidad.tipo,
      encargado_id: selectedUnidad.encargado_id || null,
    });
    setIsEditOpen(true);
  };

  const filteredUnidades = unidades.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Sidebar List */}
      <div className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 space-y-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg tracking-tight">Unidades Académicas</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => form.reset()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Unidad</DialogTitle>
                  <DialogDescription>
                    Cree una nueva unidad académica (Instituto, Centro o Vicerrectoría).
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Unidad</FormLabel>
                          <FormControl>
                            <Input placeholder="Instituto de Informática" {...field} />
                          </FormControl>
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
                                <Input placeholder="INFO" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="tipo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="centro">Centro</SelectItem>
                                    <SelectItem value="instituto">Instituto</SelectItem>
                                    <SelectItem value="vicerrectoria">Vicerrectoría</SelectItem>
                                    <SelectItem value="unidad">Unidad</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="encargado_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Director / Encargado</FormLabel>
                          <TeacherCombobox 
                            teachers={docentes}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Buscar docente por nombre o RUT..."
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit">Crear</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground p-4">Cargando...</p>
            ) : filteredUnidades.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground p-4">No se encontraron unidades</p>
            ) : (
              filteredUnidades.map((unidad) => (
                <button
                  key={unidad.id}
                  onClick={() => setSelectedUnidad(unidad)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-center justify-between group ${
                    selectedUnidad?.id === unidad.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span>{unidad.nombre}</span>
                    <span className="text-xs text-muted-foreground uppercase">{unidad.tipo} - {unidad.code}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 opacity-0 transition-opacity ${
                    selectedUnidad?.id === unidad.id ? 'opacity-100' : 'group-hover:opacity-50'
                  }`} />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedUnidad ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-start bg-background">
              <div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase text-[10px]">{selectedUnidad.tipo}</Badge>
                    <h1 className="text-2xl font-bold">{selectedUnidad.nombre}</h1>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <UserCircle className="h-4 w-4" />
                    <span>Director/a: <span className="text-foreground font-medium">{selectedUnidad.encargado_name || 'No asignado'}</span></span>
                  </div>
                  <span className="text-muted-foreground/30">|</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{unitDocentes.length} docentes asociados</span>
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openEditDialog}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar Unidad
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar Unidad
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Edit Dialog */}
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Unidad</DialogTitle>
                    <DialogDescription>
                      Actualice la información de la unidad académica.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
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
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tipo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="centro">Centro</SelectItem>
                                        <SelectItem value="instituto">Instituto</SelectItem>
                                        <SelectItem value="vicerrectoria">Vicerrectoría</SelectItem>
                                        <SelectItem value="unidad">Unidad</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="encargado_id"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Director / Encargado</FormLabel>
                            <TeacherCombobox 
                              teachers={docentes}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Buscar docente por nombre o RUT..."
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button type="submit">Guardar Cambios</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar unidad?</AlertDialogTitle>
                    <AlertDialogDescription>
                      No se puede deshacer. Los docentes asociados dejarán de pertenecer a esta unidad.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="docentes" className="flex-1 flex flex-col">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="docentes">Docentes de la Unidad</TabsTrigger>
                    <TabsTrigger value="info">Información General</TabsTrigger>
                  </TabsList>
                </div>
                <Separator className="mt-4" />
                <ScrollArea className="flex-1 bg-muted/5">
                  <div className="p-6">
                    <TabsContent value="docentes" className="mt-0">
                      <div className="rounded-md border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unitDocentes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                  No hay docentes asociados a esta unidad.
                                </TableCell>
                              </TableRow>
                            ) : (
                              unitDocentes.map((d) => (
                                <TableRow key={d.id}>
                                  <TableCell className="font-medium">{d.name}</TableCell>
                                  <TableCell>{d.email}</TableCell>
                                  <TableCell>
                                    <Badge variant={d.activo ? "default" : "secondary"}>
                                      {d.activo ? "Activo" : "Inactivo"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="info" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg bg-background">
                                <h4 className="font-semibold mb-2">Detalles</h4>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Tipo:</dt>
                                        <dd className="capitalize">{selectedUnidad.tipo}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Código:</dt>
                                        <dd className="font-mono">{selectedUnidad.code}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Creado el:</dt>
                                        <dd>{new Date(selectedUnidad.created_at).toLocaleDateString()}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Building2 className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Seleccione una unidad</h3>
            <p>Seleccione una unidad académica para gestionar su personal y directiva.</p>
          </div>
        )}
      </div>
    </div>
  );
}