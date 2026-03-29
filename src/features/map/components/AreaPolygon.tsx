import { Polygon, Popup } from 'react-leaflet';
import type { MapArea } from '../types';

interface AreaPolygonProps {
  area: MapArea;
}

const areaTypeLabels: Record<string, string> = {
  estacionamiento: 'Estacionamiento',
  zona_verde: 'Zona Verde',
  patio: 'Patio',
  cancha: 'Cancha Deportiva',
  restringida: 'Zona Restringida',
  otro: 'Otro',
};

export function AreaPolygon({ area }: AreaPolygonProps) {
  return (
    <Polygon
      positions={area.coordinates}
      pathOptions={{
        color: area.color,
        fillColor: area.color,
        fillOpacity: area.fillOpacity,
        weight: 2,
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-sm">{area.name}</h3>
          <p className="text-xs text-gray-600">{areaTypeLabels[area.type]}</p>
          {area.description && (
            <p className="text-xs text-gray-700 mt-1">{area.description}</p>
          )}
        </div>
      </Popup>
    </Polygon>
  );
}
