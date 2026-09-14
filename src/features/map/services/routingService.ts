/**
 * Servicio de routing usando OpenRouteService.
 * Solo se usa al CREAR rutas (gestor). La navegación pública usa rutas guardadas.
 */

import { getSystemConfig } from '@/features/settings/services/settingsService'

const ORS_BASE = 'https://api.openrouteservice.org/v2/directions/foot-walking'

export interface ORSRoute {
  points: Array<[number, number]> // [lat, lng]
  distance: number // metros
  duration: number // segundos
}

/**
 * Obtiene la ruta peatonal entre dos puntos usando OpenRouteService.
 */
export async function getWalkingRoute(
  from: [number, number],
  to: [number, number]
): Promise<ORSRoute> {
  const config = await getSystemConfig()
  const apiKey = config.ors_api_key

  if (!apiKey) {
    throw new Error('API key de OpenRouteService no configurada. Ve a Configuración → Mapa y Navegación.')
  }

  const body = {
    coordinates: [
      [from[1], from[0]], // ORS usa [lng, lat]
      [to[1], to[0]],
    ],
  }

  const response = await fetch(ORS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('API key inválida. Revisa la configuración.')
    }
    throw new Error(`Error del servicio de rutas (${response.status})`)
  }

  const data = await response.json()
  const route = data.routes?.[0]

  if (!route?.geometry) {
    throw new Error('No se encontró ruta peatonal entre esos puntos')
  }

  return {
    points: decodePolyline(route.geometry),
    distance: route.summary?.distance || 0,
    duration: route.summary?.duration || 0,
  }
}

/** Decodifica Google Encoded Polyline a [lat, lng][] */
function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)

    shift = 0; result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}
