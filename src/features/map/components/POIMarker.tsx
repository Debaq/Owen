import { Marker, Popup, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { POI } from '../types';
import { getPOICategoryConfig } from '../types';

interface POIMarkerProps {
  poi: POI;
}

export function POIMarker({ poi }: POIMarkerProps) {
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
          {poi.metadata && Object.keys(poi.metadata).length > 0 && (
            <div className="mt-2 pt-2 border-t text-xs text-gray-600">
              {Object.entries(poi.metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="font-semibold">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
