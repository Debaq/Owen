import { Marker, Popup, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { Edificio } from '@/shared/types/models';
import type { Sala } from '@/shared/types/models';
import type { POI } from '../types';
import { getPOICategoryConfig } from '../types';

interface BuildingMarkerProps {
  edificio: Edificio;
  salas?: Sala[];
  pois?: POI[];
}

export function BuildingMarker({ edificio, salas = [], pois = [] }: BuildingMarkerProps) {
  // Filtrar salas y POIs de este edificio
  const salasEdificio = salas.filter(s => s.edificio_id === edificio.id);
  const poisEdificio = pois.filter(p => p.edificio_id === edificio.id);

  const icon = divIcon({
    html: `
      <div style="
        background-color: #2563eb;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        🏢
      </div>
    `,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  // Agrupar POIs por categoría
  const poisPorCategoria = poisEdificio.reduce((acc, poi) => {
    if (!acc[poi.category]) acc[poi.category] = [];
    acc[poi.category].push(poi);
    return acc;
  }, {} as Record<string, POI[]>);

  // Agrupar salas por tipo
  const salasPorTipo = salasEdificio.reduce((acc, sala) => {
    if (!acc[sala.tipo]) acc[sala.tipo] = [];
    acc[sala.tipo].push(sala);
    return acc;
  }, {} as Record<string, Sala[]>);

  const tipoNombres: Record<string, string> = {
    aula: 'Aulas',
    laboratorio: 'Laboratorios',
    auditorio: 'Auditorios',
    taller: 'Talleres',
    sala_reuniones: 'Salas de Reuniones',
  };

  return (
    <Marker position={[edificio.lat, edificio.lng]} icon={icon}>
      <Tooltip permanent direction="top" offset={[0, -20]} className="building-tooltip">
        <div className="text-center">
          <div className="font-bold text-sm">{edificio.name}</div>
          <div className="text-xs text-gray-600">{edificio.code}</div>
        </div>
      </Tooltip>
      <Popup maxWidth={400}>
        <div className="p-3 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🏢</span>
            <div>
              <h3 className="font-bold text-lg">{edificio.name}</h3>
              <p className="text-sm text-gray-600">{edificio.code}</p>
            </div>
          </div>

          <div className="space-y-1 text-sm mb-3">
            <div>
              <span className="font-semibold">Pisos:</span> {edificio.pisos}
            </div>
            {edificio.descripcion && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-gray-700">{edificio.descripcion}</p>
              </div>
            )}
          </div>

          {/* Salas */}
          {salasEdificio.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <h4 className="font-semibold text-sm mb-2">📚 Salas ({salasEdificio.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(salasPorTipo).map(([tipo, salas]) => (
                  <div key={tipo}>
                    <div className="text-xs font-semibold text-gray-700">{tipoNombres[tipo] || tipo}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {salas.map(sala => (
                        <span key={sala.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {sala.code}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Puntos de Interés */}
          {poisEdificio.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <h4 className="font-semibold text-sm mb-2">📍 Servicios ({poisEdificio.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(poisPorCategoria).map(([categoria, pois]) => {
                  const config = getPOICategoryConfig(categoria as any);
                  return (
                    <div key={categoria}>
                      <div className="text-xs font-semibold text-gray-700">
                        {config.icon} {config.label}
                      </div>
                      <div className="space-y-1 mt-1">
                        {pois.map(poi => (
                          <div key={poi.id} className="text-xs text-gray-600 pl-2">
                            • {poi.name}
                            {poi.description && (
                              <span className="text-gray-500"> - {poi.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {salasEdificio.length === 0 && poisEdificio.length === 0 && (
            <div className="mt-3 pt-3 border-t text-xs text-gray-500 text-center">
              No hay salas o servicios registrados en este edificio
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
