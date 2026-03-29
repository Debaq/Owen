import { Building as BuildingIcon, MapPin, Layers, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import type { Edificio as Building } from '@/shared/types/models';

interface BuildingCardProps {
  building: Building;
  onEdit: (building: Building) => void;
  onDelete: (building: Building) => void;
}

export function BuildingCard({ building, onEdit, onDelete }: BuildingCardProps) {
  const hasPhotos = building.fotos && building.fotos.length > 0;

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      {/* Cabecera con imagen o icono */}
      <div className="relative h-40 bg-muted flex items-center justify-center group">
        {hasPhotos ? (
          <img 
            src={building.fotos![0]} 
            alt={building.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <BuildingIcon className="h-12 w-12 text-muted-foreground opacity-20" />
        )}
        <div className="absolute top-2 right-2 flex gap-1">
            <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                {building.code}
            </Badge>
            {hasPhotos && (
                <Badge variant="secondary" className="bg-black/50 text-white border-none">
                    <ImageIcon className="h-3 w-3 mr-1" /> {building.fotos?.length}
                </Badge>
            )}
        </div>
      </div>

      <CardContent className="pt-4 flex-1">
        <h3 className="font-bold text-lg mb-1">{building.name}</h3>
        
        {building.descripcion && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">{building.descripcion}</p>
        )}

        <div className="space-y-2 text-sm mt-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>{building.pisos} {building.pisos === 1 ? 'piso' : 'pisos'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground border-t pt-2">
            <MapPin className="h-4 w-4" />
            <span className="font-mono text-xs truncate">
              {building.lat.toFixed(5)}, {building.lng.toFixed(5)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 border-t bg-muted/10 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(building)}
          className="h-8"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(building)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Eliminar
        </Button>
      </CardFooter>
    </Card>
  );
}