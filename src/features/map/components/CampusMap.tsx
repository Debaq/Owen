import { useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { POIMarker } from './POIMarker';
import { BuildingMarker } from './BuildingMarker';
import { RoomMarker } from './RoomMarker';
import { RoutePolyline } from './RoutePolyline';
import { AreaPolygon } from './AreaPolygon';
import { LayerControl, type LayerVisibility } from './LayerControl';
import { MapControls } from './MapControls';
import { useMapData } from '../hooks/useMapData';
import { POI_CATEGORIES_CONFIG } from '../types';

// Fix para los iconos de Leaflet en Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Puerto Montt, Chile - Coordenadas del campus
const CAMPUS_CENTER: [number, number] = [-41.48780, -72.89699];
const DEFAULT_ZOOM = 17;

interface CampusMapProps {
  className?: string;
  height?: string;
}

export function CampusMap({ className = '', height = '600px' }: CampusMapProps) {
  const { pois, routes, areas, edificios, salas, loading, error, reload } = useMapData();

  const [visibility, setVisibility] = useState<LayerVisibility>({
    buildings: true,
    rooms: true,
    routes: true,
    areas: true,
    poiCategories: new Set(
      POI_CATEGORIES_CONFIG.filter(c => c.defaultVisible).map(c => c.category)
    ),
  });

  // Filtrar POIs según visibilidad
  const visiblePOIs = useMemo(
    () => pois.filter(poi => visibility.poiCategories.has(poi.category)),
    [pois, visibility.poiCategories]
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando mapa del campus...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center text-red-600">
          <p className="font-semibold">Error al cargar el mapa</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-300 ${className}`}>
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Áreas (polígonos) - renderizar primero (abajo) */}
        {visibility.areas && areas.map(area => (
          <AreaPolygon key={area.id} area={area} />
        ))}

        {/* Rutas (polilíneas) */}
        {visibility.routes && routes.map(route => (
          <RoutePolyline key={route.id} route={route} />
        ))}

        {/* Edificios */}
        {visibility.buildings && edificios.map(edificio => (
          <BuildingMarker
            key={edificio.id}
            edificio={edificio}
            salas={salas}
            pois={pois}
          />
        ))}

        {/* Salas */}
        {visibility.rooms && salas.map(sala => (
          <RoomMarker key={sala.id} sala={sala} />
        ))}

        {/* Puntos de Interés */}
        {visiblePOIs.map(poi => (
          <POIMarker key={poi.id} poi={poi} />
        ))}
      </MapContainer>

      {/* Controles flotantes */}
      <MapControls onPOICreated={reload} />

      {/* Control de capas */}
      <LayerControl visibility={visibility} onChange={setVisibility} />

      {/* Leyenda de disponibilidad de salas */}
      {visibility.rooms && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold mb-2">Estado de Salas</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
            <span>Ocupada</span>
          </div>
        </div>
      )}
    </div>
  );
}
