import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Link } from 'react-router-dom';
import type { Sala } from '@/shared/types/models';

interface RoomMarkerProps {
  sala: Sala;
  available?: boolean; // disponibilidad actual (se puede calcular con horarios)
}

export function RoomMarker({ sala, available = true }: RoomMarkerProps) {
  const availableColor = available ? '#10b981' : '#ef4444'; // verde si está libre, rojo si ocupada

  // Icono según tipo de sala
  const tipoIcons: Record<string, string> = {
    aula: '📖',
    laboratorio: '🔬',
    auditorio: '🎭',
    taller: '🔧',
    sala_reuniones: '💼',
  };

  const icon = divIcon({
    html: `
      <div style="
        background-color: ${availableColor};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${tipoIcons[sala.tipo] || '🚪'}
      </div>
    `,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <Marker position={[sala.lat, sala.lng]} icon={icon}>
      <Popup>
        <div className="p-3 min-w-[250px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tipoIcons[sala.tipo] || '🚪'}</span>
              <div>
                <h3 className="font-bold text-base">{sala.name}</h3>
                <p className="text-xs text-gray-600">{sala.code}</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-semibold ${available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {available ? 'Disponible' : 'Ocupada'}
            </div>
          </div>

          <div className="space-y-1 text-sm mt-3">
            <div>
              <span className="font-semibold">Tipo:</span> {sala.tipo.replace('_', ' ')}
            </div>
            <div>
              <span className="font-semibold">Piso:</span> {sala.piso}
            </div>
            <div>
              <span className="font-semibold">Capacidad:</span> {sala.capacidad} personas
            </div>
            {sala.equipamiento && sala.equipamiento.length > 0 && (
              <div className="mt-2">
                <span className="font-semibold">Equipamiento:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sala.equipamiento.map((equip, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                      {equip}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            to={`/public/room/${sala.id}`}
            className="mt-3 block text-center bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 text-sm"
          >
            Ver horario completo
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
