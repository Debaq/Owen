import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Puerto Montt, Chile - Coordenadas del campus

const DEFAULT_ZOOM = 17;

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

interface MapLocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

function LocationMarker({ lat, lng, onLocationChange }: MapLocationPickerProps) {
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(new LatLng(lat, lng));
    }
  }, [lat, lng]);

  return <Marker position={[lat, lng]} ref={markerRef} draggable={true} eventHandlers={{
    dragend: (e) => {
      const marker = e.target;
      const position = marker.getLatLng();
      onLocationChange(position.lat, position.lng);
    },
  }} />;
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MapLocationPicker({ lat, lng, onLocationChange, className = '' }: MapLocationPickerProps) {
  const center: [number, number] = [lat, lng];
  
  return (
    <div className={`rounded-lg overflow-hidden border border-gray-300 ${className}`}>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '400px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <ChangeView center={center} zoom={DEFAULT_ZOOM} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          lat={lat}
          lng={lng}
          onLocationChange={onLocationChange}
        />
      </MapContainer>
      <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 border-t">
        <p>
          <span className="font-semibold">Coordenadas:</span> {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
        <p className="text-xs mt-1 text-gray-500">
          Haz click en el mapa o arrastra el marcador para cambiar la ubicación
        </p>
      </div>
    </div>
  );
}
