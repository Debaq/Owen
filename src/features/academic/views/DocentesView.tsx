import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Pencil, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  ChevronRight, 
  UserCircle,
  MoreVertical,
  Mail,
  Phone,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

import { Docente, UnidadAcademica, User } from '@/shared/types/models';
import {
  getDocentes,
  createDocente,
  updateDocente,
  deleteDocente,
  activateDocente,
  getUnidades,
  getUsers,
} from '@/features/settings/services/settingsService';

import { TeacherAvailability } from '../components/TeacherAvailability';

const formSchema = z.object({
  rut: z.string().min(8, 'RUT inválido'),
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional().nullable(),
  carreras: z.array(z.string()).default([]),
  unidad_id: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
});

export default function DocentesView() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [users, setUsers] = useState<Partial<User>[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      rut: '',
      name: '',
      email: '',
      telefono: '',
      carreras: [],
      unidad_id: null,
      user_id: null,
    },
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dData, uData, usrData] = await Promise.all([
        getDocentes(showInactive ? undefined : true),
        getUnidades(),
        getUsers(),
      ]);
      setDocentes(dData);
      setUnidades(uData);
      setUsers(usrData);

      if (selectedDocente) {
        const updated = dData.find(d => d.id === selectedDocente.id);
        if (updated) setSelectedDocente(updated);
        else setSelectedDocente(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingDocente) {
        await updateDocente(editingDocente.id, values as any);
        toast.success('Docente actualizado');
      } else {
        const newDoc = await createDocente(values as any);
        toast.success('Docente creado');
        setSelectedDocente(newDoc);
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingDocente(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar docente');
    }
  };

  const handleEdit = () => {
    if (!selectedDocente) return;
    setEditingDocente(selectedDocente);
    form.reset({
      rut: selectedDocente.rut,
      name: selectedDocente.name,
      email: selectedDocente.email,
      telefono: selectedDocente.telefono || '',
      carreras: selectedDocente.carreras || [],
      unidad_id: selectedDocente.unidad_id || null,
      user_id: selectedDocente.user_id || null,
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async () => {
    if (!selectedDocente) return;
    try {
      if (selectedDocente.activo) {
        await deleteDocente(selectedDocente.id);
        toast.success('Docente desactivado');
      } else {
        await activateDocente(selectedDocente.id);
        toast.success('Docente activado');
      }
      loadData();
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
      unidad_id: unidades.length > 0 ? unidades[0].id : null,
      user_id: null,
    });
    setIsDialogOpen(true);
  };

  const filteredDocentes = docentes.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.rut.includes(searchQuery) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Sidebar List */}
      <div className="w-85 border-r bg-muted/10 flex flex-col">
        <div className="p-4 space-y-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg tracking-tight">Docentes</h2>
            <Button size="icon" variant="ghost" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar docente..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="showInactiveSide"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3 w-3 rounded border-gray-300"
            />
            <label htmlFor="showInactiveSide" className="text-[10px] text-muted-foreground uppercase font-bold">
              Mostrar inactivos
            </label>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground p-4">Cargando...</p>
            ) : filteredDocentes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground p-4">No se encontraron docentes</p>
            ) : (
              filteredDocentes.map((docente) => (
                <button
                  key={docente.id}
                  onClick={() => setSelectedDocente(docente)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-center justify-between group ${
                    selectedDocente?.id === docente.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                  } ${!docente.activo ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col truncate">
                    <span>{docente.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{docente.rut}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 opacity-0 transition-opacity ${
                    selectedDocente?.id === docente.id ? 'opacity-100' : 'group-hover:opacity-50'
                  }`} />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDocente ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-start bg-background shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border">
                    <UserCircle className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{selectedDocente.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selectedDocente.rut}</span>
                        <Badge variant="outline" className="font-normal border-blue-200 text-blue-700 bg-blue-50/50">
                            {selectedDocente.unidad_nombre || 'Sin unidad asignada'}
                        </Badge>
                        {selectedDocente.user_id && (
                            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                <UserCheck className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase">Con Acceso</span>
                            </div>
                        )}
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
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleActive}>
                    <CheckCircle2 className={`h-4 w-4 mr-2 ${selectedDocente.activo ? 'text-orange-500' : 'text-green-500'}`} />
                    {selectedDocente.activo ? 'Desactivar Docente' : 'Activar Docente'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="perfil" className="flex-1 flex flex-col">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="perfil">Información Personal</TabsTrigger>
                    <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
                    <TabsTrigger value="asignaturas">Carga Académica</TabsTrigger>
                  </TabsList>
                </div>
                <Separator className="mt-4" />
                <ScrollArea className="flex-1 bg-muted/5">
                  <div className="p-6 max-w-5xl mx-auto">
                    <TabsContent value="perfil" className="mt-0 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 border rounded-xl bg-background shadow-sm space-y-4">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground border-b pb-2">Contacto</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg"><Mail className="h-4 w-4" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-bold">Email Institucional</p>
                                            <p className="text-sm font-medium">{selectedDocente.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg"><Phone className="h-4 w-4" /></div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-bold">Teléfono</p>
                                            <p className="text-sm font-medium">{selectedDocente.telefono || 'No registrado'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border rounded-xl bg-background shadow-sm space-y-4">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground border-b pb-2">Gestión de Cuenta</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Estado del Sistema</p>
                                        <Badge variant={selectedDocente.activo ? "default" : "secondary"}>
                                            {selectedDocente.activo ? "Habilitado" : "Inactivo"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Nombre de Usuario</p>
                                        <span className="text-sm font-medium">{selectedDocente.username || 'Sin cuenta vinculada'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="disponibilidad" className="mt-0">
                        <TeacherAvailability docenteId={selectedDocente.id} />
                    </TabsContent>

                    <TabsContent value="asignaturas" className="mt-0">
                        <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20">
                            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium">Asignación de Carga Académica</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                Próximamente: Podrá vincular asignaturas específicas a este docente por todo el semestre o fechas puntuales.
                            </p>
                        </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-1000">
            <UserCircle className="h-24 w-24 mb-4 opacity-10" />
            <h3 className="text-xl font-semibold">Gestión de Docentes</h3>
            <p className="max-w-xs text-center mt-2">Seleccione un docente de la lista para gestionar su perfil, disponibilidad y carga académica.</p>
          </div>
        )}
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
            <DialogTitle>
                {editingDocente ? 'Editar Docente' : 'Nuevo Docente'}
            </DialogTitle>
            <DialogDescription>
                Ingrese la información personal y académica del docente.
            </DialogDescription>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        name="telefono"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Teléfono (Opcional)</FormLabel>
                            <FormControl>
                            <Input placeholder="+569..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="unidad_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Unidad Académica</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar unidad" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {unidades.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="user_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Usuario del Sistema (Opcional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin cuenta de acceso" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">Sin acceso</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id!}>{u.name} ({u.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>Vincular si el docente tiene cargo de gestión.</FormDescription>
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
                <Button type="submit">Guardar Cambios</Button>
                </div>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}