import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Search, 
  GraduationCap, 
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  UserCircle
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
import { TeacherCombobox } from '@/shared/components/ui/teacher-combobox';

import { Carrera, Docente } from '@/shared/types/models';
import {
  getCarreras,
  createCarrera,
  updateCarrera,
  deleteCarrera,
  getDocentes,
} from '@/features/settings/services/settingsService';

import { LevelsList } from '../components/LevelsList';
import { SubjectsList } from '../components/SubjectsList';

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres'),
  director_id: z.string().optional().nullable(),
});

export default function CarrerasView() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [selectedCarrera, setSelectedCarrera] = useState<Carrera | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      director_id: null,
    },
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cData, dData] = await Promise.all([
        getCarreras(),
        getDocentes(true)
      ]);
      setCarreras(cData);
      setDocentes(dData);
      
      if (selectedCarrera) {
        const updated = cData.find(c => c.id === selectedCarrera.id);
        if (updated) setSelectedCarrera(updated);
        else setSelectedCarrera(null);
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

  const handleCreate = async (values: z.infer<typeof formSchema>) => {
    try {
      const newCarrera = await createCarrera(values as any);
      toast.success('Carrera creada');
      setIsCreateOpen(false);
      form.reset();
      fetchData();
      setSelectedCarrera(newCarrera);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 409) {
        toast.error('El código de carrera ya existe. Por favor use uno diferente.');
      } else {
        toast.error('Error al crear carrera');
      }
    }
  };

  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!selectedCarrera) return;
    try {
      await updateCarrera(selectedCarrera.id, values as any);
      toast.success('Carrera actualizada');
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 409) {
        toast.error('El código de carrera ya existe. No se pudo actualizar.');
      } else {
        toast.error('Error al actualizar carrera');
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedCarrera) return;
    try {
      await deleteCarrera(selectedCarrera.id);
      toast.success('Carrera eliminada');
      setIsDeleteOpen(false);
      setSelectedCarrera(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar carrera');
    }
  };

  const openEditDialog = () => {
    if (!selectedCarrera) return;
    form.reset({
      name: selectedCarrera.name,
      code: selectedCarrera.code,
      director_id: selectedCarrera.director_id || null,
    });
    setIsEditOpen(true);
  };

  const filteredCarreras = carreras.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Sidebar List */}
      <div className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 space-y-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg tracking-tight">Carreras</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => form.reset()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Carrera</DialogTitle>
                  <DialogDescription>
                    Complete los datos para registrar una nueva carrera en el sistema.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Carrera</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingeniería Civil..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código</FormLabel>
                          <FormControl>
                            <Input placeholder="ICI" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="director_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Director/a de Carrera</FormLabel>
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
                      <Button type="submit">Crear Carrera</Button>
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
            ) : filteredCarreras.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground p-4">No hay carreras</p>
            ) : (
              filteredCarreras.map((carrera) => (
                <button
                  key={carrera.id}
                  onClick={() => setSelectedCarrera(carrera)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-center justify-between group ${
                    selectedCarrera?.id === carrera.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span>{carrera.name}</span>
                    <span className="text-xs text-muted-foreground">{carrera.code}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 opacity-0 transition-opacity ${
                    selectedCarrera?.id === carrera.id ? 'opacity-100' : 'group-hover:opacity-50'
                  }`} />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedCarrera ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-start bg-background">
              <div>
                <h1 className="text-2xl font-bold">{selectedCarrera.name}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono font-medium text-foreground">
                    {selectedCarrera.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <UserCircle className="h-4 w-4" />
                    <span>Director/a: <span className="text-foreground font-medium">{selectedCarrera.director_name || 'No asignado'}</span></span>
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
                    <Pencil className="h-4 w-4 mr-2" /> Editar Carrera
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar Carrera
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Edit Dialog */}
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Carrera</DialogTitle>
                    <DialogDescription>
                      Actualice la información de la carrera seleccionada.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
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
                        name="director_id"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Director/a de Carrera</FormLabel>
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
                    <AlertDialogTitle>¿Eliminar carrera?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminarán todos los niveles y asignaturas asociados.
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

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="asignaturas" className="h-full flex flex-col">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="asignaturas">Asignaturas</TabsTrigger>
                    <TabsTrigger value="niveles">Niveles</TabsTrigger>
                  </TabsList>
                </div>
                <Separator className="mt-4" />
                <ScrollArea className="flex-1 bg-muted/5">
                  <div className="p-6 max-w-5xl mx-auto">
                    <TabsContent value="asignaturas" className="mt-0">
                      <SubjectsList carreraId={selectedCarrera.id} />
                    </TabsContent>
                    <TabsContent value="niveles" className="mt-0">
                      <LevelsList carreraId={selectedCarrera.id} />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <GraduationCap className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Seleccione una carrera</h3>
            <p>Gestione el personal académico, niveles y asignaturas por carrera.</p>
          </div>
        )}
      </div>
    </div>
  );
}