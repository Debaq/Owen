import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { POI_CATEGORIES_CONFIG, type POICategory } from '../types';

export interface LayerVisibility {
  buildings: boolean;
  rooms: boolean;
  routes: boolean;
  areas: boolean;
  poiCategories: Set<POICategory>;
}

interface LayerControlProps {
  visibility: LayerVisibility;
  onChange: (visibility: LayerVisibility) => void;
}

export function LayerControl({ visibility, onChange }: LayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const togglePOICategory = (category: POICategory) => {
    const newCategories = new Set(visibility.poiCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    onChange({ ...visibility, poiCategories: newCategories });
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Card className="bg-white shadow-lg">
        <div className="p-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 font-semibold text-sm w-full"
          >
            <span>🗺️</span>
            <span>Capas del Mapa</span>
            <span className="ml-auto">{isOpen ? '▼' : '▶'}</span>
          </button>

          {isOpen && (
            <div className="mt-3 space-y-3">
              {/* Capas principales */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase">Principal</h3>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibility.buildings}
                    onChange={(e) => onChange({ ...visibility, buildings: e.target.checked })}
                    className="rounded"
                  />
                  <span>🏢 Edificios</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibility.rooms}
                    onChange={(e) => onChange({ ...visibility, rooms: e.target.checked })}
                    className="rounded"
                  />
                  <span>🚪 Salas</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibility.routes}
                    onChange={(e) => onChange({ ...visibility, routes: e.target.checked })}
                    className="rounded"
                  />
                  <span>🛤️ Rutas</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibility.areas}
                    onChange={(e) => onChange({ ...visibility, areas: e.target.checked })}
                    className="rounded"
                  />
                  <span>🏞️ Áreas</span>
                </label>
              </div>

              {/* Puntos de Interés */}
              <div className="space-y-2 pt-2 border-t">
                <h3 className="text-xs font-semibold text-gray-700 uppercase">Puntos de Interés</h3>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {POI_CATEGORIES_CONFIG.map(({ category, label, icon }) => (
                    <label key={category} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibility.poiCategories.has(category)}
                        onChange={() => togglePOICategory(category)}
                        className="rounded"
                      />
                      <span>{icon} {label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Botones rápidos */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => onChange({
                    buildings: true,
                    rooms: true,
                    routes: true,
                    areas: true,
                    poiCategories: new Set(POI_CATEGORIES_CONFIG.filter(c => c.defaultVisible).map(c => c.category)),
                  })}
                  className="flex-1 text-xs py-1 px-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Todo
                </button>
                <button
                  onClick={() => onChange({
                    buildings: false,
                    rooms: false,
                    routes: false,
                    areas: false,
                    poiCategories: new Set(),
                  })}
                  className="flex-1 text-xs py-1 px-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  Ninguno
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
