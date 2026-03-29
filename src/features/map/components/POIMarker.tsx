import { Marker, Popup, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { POI } from '../types';
import { getPOICategoryConfig } from '../types';

interface POIMarkerProps {
  poi: POI;
  canEdit?: boolean;
  onEdit?: (poi: POI) => void;
  onDelete?: (poi: POI) => void;
}

export function POIMarker({ poi, canEdit, onEdit, onDelete }: POIMarkerProps) {
  const config = getPOICategoryConfig(poi.category);
  const iconEmoji = poi.icon || config.icon;
  const markerColor = poi.color || config.color;

  const icon = divIcon({
    html: `
      <div style="
        background-color: ${markerColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${iconEmoji}
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <Marker position={[poi.lat, poi.lng]} icon={icon}>
      <Tooltip permanent direction="top" offset={[0, -16]} className="poi-tooltip">
        <span className="text-xs font-semibold">{poi.name}</span>
      </Tooltip>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{iconEmoji}</span>
            <div>
              <h3 className="font-bold text-sm">{poi.name}</h3>
              <p className="text-xs text-gray-500">{config.label}</p>
            </div>
          </div>
          {poi.description && (
            <p className="text-sm text-gray-700 mt-2">{poi.description}</p>
          )}
          {poi.metadata?.piso && (
            <p className="text-xs text-gray-500 mt-1">Piso {poi.metadata.piso}</p>
          )}
          {canEdit && (
            <div className="flex gap-2 mt-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => onEdit?.(poi)}
                className="flex-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(poi)}
                className="flex-1 px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
