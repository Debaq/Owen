import { Building } from '../types';
import { BuildingCard } from './BuildingCard';

interface BuildingListProps {
  buildings: Building[];
  onEdit: (building: Building) => void;
  onDelete: (building: Building) => void;
}

export function BuildingList({ buildings, onEdit, onDelete }: BuildingListProps) {
  if (buildings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay edificios registrados</p>
        <p className="text-sm text-gray-400 mt-2">
          Crea el primer edificio haciendo click en "Nuevo Edificio"
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {buildings.map((building) => (
        <BuildingCard
          key={building.id}
          building={building}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
