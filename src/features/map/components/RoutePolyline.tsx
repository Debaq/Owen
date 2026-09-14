import { Polyline, Popup } from 'react-leaflet';
import type { Route } from '../types';

interface RoutePolylineProps {
  route: Route;
  canEdit?: boolean;
  onDelete?: (route: Route) => void;
}

const routeTypeLabels: Record<string, string> = {
  peatonal: 'Ruta Peatonal',
  vehicular: 'Ruta Vehicular',
  bicicleta: 'Ciclovía',
  accesible: 'Ruta Accesible (Rampa)',
};

export function RoutePolyline({ route, canEdit, onDelete }: RoutePolylineProps) {
  return (
    <Polyline
      positions={route.points}
      pathOptions={{
        color: route.color,
        weight: route.width,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    >
      <Popup>
        <div className="p-2 min-w-[180px]">
          <h3 className="font-bold text-sm">{route.name}</h3>
          <p className="text-xs text-gray-600">{routeTypeLabels[route.type]}</p>
          {route.description && (
            <p className="text-xs text-gray-700 mt-1">{route.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{route.points.length} puntos</p>
          {canEdit && onDelete && (
            <div className="mt-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => onDelete(route)}
                className="w-full px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
              >
                Eliminar ruta
              </button>
            </div>
          )}
        </div>
      </Popup>
    </Polyline>
  );
}
