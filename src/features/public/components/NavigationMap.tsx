import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRoutes } from '@/features/map/services/mapService'
import { findPath } from '@/features/map/services/pathfinding'
import type { Route } from '@/features/map/types'

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

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds.pad(0.3))
  }, [points, map])
  return null
}

export function NavigationMap({
  origin, originLabel, destination, destinationLabel,
  onRouteFound,
}: NavigationMapProps) {
  const [routes, setRoutes] = useState<Route[]>([])

  useEffect(() => {
    getRoutes().then(setRoutes).catch(() => setRoutes([]))
  }, [])

  const navigation = useMemo(() => {
    if (!destination) return null
    return findPath(origin, destination, routes)
  }, [origin[0], origin[1], destination?.[0], destination?.[1], routes])

  useEffect(() => {
    if (!navigation || !onRouteFound) return
    // 80 m/min = 4.8 km/h caminando
    onRouteFound({ distance: navigation.distance, time: (navigation.distance / 80) * 60 })
  }, [navigation])

  const center = destination
    ? [(origin[0] + destination[0]) / 2, (origin[1] + destination[1]) / 2] as [number, number]
    : origin

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: '400px' }}>
      <MapContainer
        center={center}
        zoom={destination ? 16 : 18}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        touchZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Rutas del campus (referencia visual gris) */}
        {routes.map(route => (
          <Polyline
            key={route.id}
            positions={route.points}
            pathOptions={{ color: '#d1d5db', weight: 3, opacity: 0.5 }}
          />
        ))}

        {/* Marcador origen */}
        <Marker position={origin} icon={youAreHereIcon}>
          <Popup>
            <strong>Estás aquí</strong><br />
            {originLabel}
          </Popup>
        </Marker>

        {/* Destino + ruta calculada */}
        {destination && navigation && (
          <>
            <Marker position={destination} icon={destIcon}>
              <Popup>
                <strong>Destino</strong><br />
                {destinationLabel}
              </Popup>
            </Marker>

            <Polyline
              positions={navigation.path}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.8,
                dashArray: navigation.usedRoutes ? undefined : '10, 8',
              }}
            />

            <FitBounds points={navigation.path} />
          </>
        )}
      </MapContainer>
    </div>
  )
}
