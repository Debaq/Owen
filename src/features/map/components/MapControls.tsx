import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { POIForm } from './POIForm';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface MapControlsProps {
  onPOICreated?: () => void;
}

export function MapControls({ onPOICreated }: MapControlsProps) {
  const { user } = useAuth();
  const [showPOIDialog, setShowPOIDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Solo mostrar controles para gestores
  if (!user || user.role !== 'gestor') {
    return null;
  }

  const handlePOISuccess = () => {
    setShowPOIDialog(false);
    onPOICreated?.();
  };

  return (
    <>
      <div className="absolute bottom-24 left-4 z-[1000]">
        <Card className="bg-white shadow-lg">
          <div className="p-2">
            {!isExpanded ? (
              <Button
                onClick={() => setIsExpanded(true)}
                size="sm"
                className="w-full"
              >
                🛠️ Herramientas
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">🛠️ Herramientas</span>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <Button
                  onClick={() => setShowPOIDialog(true)}
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                >
                  📍 Agregar Punto de Interés
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                  title="Próximamente"
                >
                  🛤️ Dibujar Ruta
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                  title="Próximamente"
                >
                  🏞️ Delimitar Área
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Leyenda de ayuda */}
        {isExpanded && (
          <Card className="bg-blue-50 mt-2 p-3">
            <div className="text-xs text-blue-900">
              <div className="font-semibold mb-1">💡 Consejos:</div>
              <ul className="space-y-1">
                <li>• Asocia POIs a edificios para verlos en el popup</li>
                <li>• Baños, cafeterías, etc. deben estar en un edificio</li>
                <li>• Usa el selector de ubicación en el formulario</li>
              </ul>
            </div>
          </Card>
        )}
      </div>

      {/* Diálogo de creación de POI */}
      <Dialog open={showPOIDialog} onOpenChange={setShowPOIDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Punto de Interés</DialogTitle>
            <DialogDescription>
              Completa la información para situar un nuevo marcador o servicio en el mapa del campus.
            </DialogDescription>
          </DialogHeader>
          <POIForm
            onSuccess={handlePOISuccess}
            onCancel={() => setShowPOIDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
