import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { toast } from 'sonner';
import { BuildingList } from '../components/BuildingList';
import { BuildingForm } from '../components/BuildingForm';
import { buildingService } from '../services/buildingService';
import type { Building, BuildingFormData } from '../types';

export function BuildingsView() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    try {
      setIsLoading(true);
      const data = await buildingService.getAll();
      setBuildings(data);
    } catch (error: any) {
      toast.error('Error al cargar edificios');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedBuilding(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (building: Building) => {
    setSelectedBuilding(building);
    setIsDialogOpen(true);
  };

  const handleDelete = (building: Building) => {
    setBuildingToDelete(building);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!buildingToDelete) return;

    try {
      await buildingService.delete(buildingToDelete.id);
      toast.success('Edificio eliminado correctamente');
      loadBuildings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar edificio');
    } finally {
      setIsDeleteDialogOpen(false);
      setBuildingToDelete(null);
    }
  };

  const handleSubmit = async (data: BuildingFormData) => {
    try {
      if (selectedBuilding) {
        await buildingService.update({ ...data, id: selectedBuilding.id });
      } else {
        await buildingService.create(data);
      }
      setIsDialogOpen(false);
      loadBuildings();
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando edificios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edificios</h1>
          <p className="text-gray-600 mt-1">Gestiona los edificios del campus</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Edificio
        </Button>
      </div>

      <BuildingList
        buildings={buildings}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBuilding ? 'Editar Edificio' : 'Nuevo Edificio'}
            </DialogTitle>
            <DialogDescription>
              {selectedBuilding 
                ? 'Modifica los datos del edificio seleccionado.' 
                : 'Ingresa la información para registrar un nuevo edificio.'}
            </DialogDescription>
          </DialogHeader>
          <BuildingForm
            building={selectedBuilding || undefined}
            onSubmit={handleSubmit}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el edificio "{buildingToDelete?.name}".
              Esta acción no se puede deshacer.
              {buildingToDelete && (
                <span className="block mt-2 text-red-600 font-medium">
                  Nota: No se puede eliminar si tiene salas asociadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
