import { Polyline, Popup } from 'react-leaflet';
import type { Route } from '../types';

interface RoutePolylineProps {
  route: Route;
}

const routeTypeLabels: Record<string, string> = {
  peatonal: 'Ruta Peatonal',
  vehicular: 'Ruta Vehicular',
  bicicleta: 'Ciclovía',
  accesible: 'Ruta Accesible (Rampa)',
};

export function RoutePolyline({ route }: RoutePolylineProps) {
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
        <div className="p-2">
          <h3 className="font-bold text-sm">{route.name}</h3>
          <p className="text-xs text-gray-600">{routeTypeLabels[route.type]}</p>
          {route.description && (
            <p className="text-xs text-gray-700 mt-1">{route.description}</p>
          )}
        </div>
      </Popup>
    </Polyline>
  );
}
