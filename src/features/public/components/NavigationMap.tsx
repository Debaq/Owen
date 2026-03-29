import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

export interface RouteInfo {
  distance: number // metros
  time: number // segundos
}

interface NavigationMapProps {
  origin: [number, number]
  originLabel: string
  destination: [number, number] | null
  destinationLabel?: string
  onRouteFound?: (info: RouteInfo) => void
  onRouteError?: () => void
}

// Marcador "Estás aquí" con pulso
const youAreHereIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);z-index:2;"></div>
      <div style="position:absolute;inset:-6px;background:#dc262640;border-radius:50%;animation:pulse-ring 1.5s ease-out infinite;"></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(2); opacity: 0; }
      }
    </style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
})

const destIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Componente interno que maneja el routing con useMap()
function RoutingControl({
  origin,
  destination,
  onRouteFound,
  onRouteError,
}: {
  origin: [number, number]
  destination: [number, number]
  onRouteFound?: (info: RouteInfo) => void
  onRouteError?: () => void
}) {
  const map = useMap()
  const controlRef = useRef<L.Routing.Control | null>(null)

  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.remove()
      controlRef.current = null
    }

    const control = L.Routing.control({
      waypoints: [
        L.latLng(origin[0], origin[1]),
        L.latLng(destination[0], destination[1]),
      ],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'foot',
      }),
      routeWhileDragging: false,
      addWaypoints: false,
      show: false,
      fitSelectedRoutes: false,
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 5, opacity: 0.7, dashArray: '10, 8' }],
        addWaypoints: false,
      },
    })

    control.on('routesfound', (e: L.Routing.RoutingEvent) => {
      if (e.routes && e.routes.length > 0) {
        const route = e.routes[0]
        onRouteFound?.({
          distance: route.summary.totalDistance,
          time: route.summary.totalTime,
        })
      }
      // Ajustar vista para mostrar toda la ruta
      const bounds = L.latLngBounds([
        L.latLng(origin[0], origin[1]),
        L.latLng(destination[0], destination[1]),
      ])
      map.fitBounds(bounds.pad(0.3))
    })

    control.on('routingerror', () => {
      onRouteError?.()
    })

    control.addTo(map)
    controlRef.current = control

    return () => {
      if (controlRef.current) {
        controlRef.current.remove()
        controlRef.current = null
      }
    }
  }, [origin[0], origin[1], destination[0], destination[1]])

  return null
}

export function NavigationMap({
  origin, originLabel, destination, destinationLabel,
  onRouteFound, onRouteError,
}: NavigationMapProps) {
  const center = destination
    ? [(origin[0] + destination[0]) / 2, (origin[1] + destination[1]) / 2] as [number, number]
    : origin

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: '400px' }}>
      <MapContainer
        center={center}
        zoom={destination ? 16 : 18}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        touchZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcador origen */}
        <Marker position={origin} icon={youAreHereIcon}>
          <Popup>
            <strong>Estas aqui</strong><br />
            {originLabel}
          </Popup>
        </Marker>

        {/* Marcador destino */}
        {destination && (
          <Marker position={destination} icon={destIcon}>
            <Popup>
              <strong>Destino</strong><br />
              {destinationLabel}
            </Popup>
          </Marker>
        )}

        {/* Ruta */}
        {destination && (
          <RoutingControl
            origin={origin}
            destination={destination}
            onRouteFound={onRouteFound}
            onRouteError={onRouteError}
          />
        )}
      </MapContainer>

      {/* Ocultar panel de instrucciones de LRM si aparece */}
      <style>{`.leaflet-routing-container { display: none !important; }`}</style>
    </div>
  )
}
