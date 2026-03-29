import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { POIForm } from '../components/POIForm';
import { getPOIs, deletePOI } from '../services/mapService';
import { getPOICategoryConfig, type POI } from '../types';
import { toast } from 'sonner';

export function POIManagerView() {
  const [pois, setPOIs] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | undefined>();

  const loadPOIs = async () => {
    try {
      setLoading(true);
      const data = await getPOIs();
      setPOIs(data);
    } catch (error) {
      toast.error('Error al cargar puntos de interés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOIs();
  }, []);

  const handleCreate = () => {
    setSelectedPOI(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (poi: POI) => {
    setSelectedPOI(poi);
    setDialogOpen(true);
  };

  const handleDelete = async (poi: POI) => {
    if (!confirm(`¿Eliminar "${poi.name}"?`)) return;

    try {
      await deletePOI(poi.id);
      toast.success('Punto de interés eliminado');
      loadPOIs();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    loadPOIs();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Puntos de Interés del Campus</h1>
          <p className="text-gray-600 mt-1">
            Gestiona estacionamientos, baños, bibliotecas y otros puntos importantes
          </p>
        </div>
        <Button onClick={handleCreate}>
          ➕ Agregar Punto de Interés
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pois.map(poi => {
          const config = getPOICategoryConfig(poi.category);
          return (
            <Card key={poi.id} className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: poi.color || config.color }}
                >
                  {poi.icon || config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{poi.name}</h3>
                  <p className="text-sm text-gray-600">{config.label}</p>
                  {poi.description && (
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{poi.description}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(poi)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(poi)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {pois.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No hay puntos de interés registrados</p>
          <p className="text-sm mt-2">Comienza agregando estacionamientos, baños, etc.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPOI ? 'Editar Punto de Interés' : 'Nuevo Punto de Interés'}
            </DialogTitle>
          </DialogHeader>
          <POIForm
            poi={selectedPOI}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
