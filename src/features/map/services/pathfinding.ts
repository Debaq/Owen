/**
 * Pathfinding sobre la red de rutas del campus.
 * Construye un grafo con todos los segmentos de ruta guardados y usa Dijkstra
 * para encontrar el camino más corto entre dos puntos cualesquiera.
 */

import type { Route } from '../types'

/** Distancia Haversine en metros */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Clave única para un punto (redondeado a ~1m de precisión) */
function pointKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

interface GraphEdge {
  to: string        // key del nodo destino
  distance: number  // metros
  points: Array<[number, number]> // puntos intermedios para dibujar
}

type Graph = Map<string, GraphEdge[]>

/**
 * Construye un grafo a partir de las rutas del campus.
 * Cada punto de cada ruta es un nodo. Los segmentos consecutivos son aristas.
 * Los nodos cercanos entre rutas diferentes se conectan automáticamente.
 */
export function buildGraph(routes: Route[]): Graph {
  const graph: Graph = new Map()

  const addEdge = (fromKey: string, toKey: string, dist: number, pts: Array<[number, number]>) => {
    if (!graph.has(fromKey)) graph.set(fromKey, [])
    graph.get(fromKey)!.push({ to: toKey, distance: dist, points: pts })
  }

  // Agregar aristas de cada ruta
  for (const route of routes) {
    if (route.points.length < 2) continue

    for (let i = 0; i < route.points.length - 1; i++) {
      const [lat1, lng1] = route.points[i]
      const [lat2, lng2] = route.points[i + 1]
      const k1 = pointKey(lat1, lng1)
      const k2 = pointKey(lat2, lng2)
      const dist = haversine(lat1, lng1, lat2, lng2)

      // Arista bidireccional
      addEdge(k1, k2, dist, [route.points[i], route.points[i + 1]])
      addEdge(k2, k1, dist, [route.points[i + 1], route.points[i]])
    }
  }

  // Conectar nodos cercanos entre rutas diferentes (intersecciones < 15m)
  const allNodes = Array.from(graph.keys())
  for (let i = 0; i < allNodes.length; i++) {
    const [lat1, lng1] = allNodes[i].split(',').map(Number)
    for (let j = i + 1; j < allNodes.length; j++) {
      const [lat2, lng2] = allNodes[j].split(',').map(Number)
      const dist = haversine(lat1, lng1, lat2, lng2)

      if (dist < 15 && dist > 0.1) {
        // Conectar nodos cercanos de rutas diferentes
        const alreadyConnected = graph.get(allNodes[i])?.some(e => e.to === allNodes[j])
        if (!alreadyConnected) {
          addEdge(allNodes[i], allNodes[j], dist, [[lat1, lng1], [lat2, lng2]])
          addEdge(allNodes[j], allNodes[i], dist, [[lat2, lng2], [lat1, lng1]])
        }
      }
    }
  }

  return graph
}

/**
 * Encuentra el nodo del grafo más cercano a un punto dado.
 * Retorna la key del nodo y la distancia.
 */
function findClosestNode(
  target: [number, number],
  graph: Graph
): { key: string; distance: number; point: [number, number] } | null {
  let best: { key: string; distance: number; point: [number, number] } | null = null

  for (const key of graph.keys()) {
    const [lat, lng] = key.split(',').map(Number)
    const dist = haversine(target[0], target[1], lat, lng)
    if (!best || dist < best.distance) {
      best = { key, distance: dist, point: [lat, lng] }
    }
  }

  return best
}

export interface PathResult {
  path: Array<[number, number]> // puntos del camino para dibujar
  distance: number              // distancia total en metros
  usedRoutes: boolean           // true si usó rutas guardadas, false si es línea recta
}

/**
 * Dijkstra: encuentra el camino más corto entre dos nodos del grafo.
 */
function dijkstra(
  graph: Graph,
  startKey: string,
  endKey: string
): { path: string[]; distance: number } | null {
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  const visited = new Set<string>()

  // Min-heap simple con array
  const queue: Array<{ key: string; dist: number }> = []

  dist.set(startKey, 0)
  prev.set(startKey, null)
  queue.push({ key: startKey, dist: 0 })

  while (queue.length > 0) {
    // Extraer el de menor distancia
    queue.sort((a, b) => a.dist - b.dist)
    const current = queue.shift()!

    if (visited.has(current.key)) continue
    visited.add(current.key)

    if (current.key === endKey) {
      // Reconstruir camino
      const path: string[] = []
      let node: string | null | undefined = endKey
      while (node) {
        path.unshift(node)
        node = prev.get(node)
      }
      return { path, distance: dist.get(endKey)! }
    }

    const edges = graph.get(current.key) || []
    for (const edge of edges) {
      if (visited.has(edge.to)) continue
      const newDist = current.dist + edge.distance
      if (!dist.has(edge.to) || newDist < dist.get(edge.to)!) {
        dist.set(edge.to, newDist)
        prev.set(edge.to, current.key)
        queue.push({ key: edge.to, dist: newDist })
      }
    }
  }

  return null // no hay camino
}

/**
 * Encuentra el mejor camino entre origen y destino usando la red de rutas.
 * Máxima distancia al nodo más cercano: 300m (si está más lejos, fallback a línea recta).
 */
export function findPath(
  origin: [number, number],
  destination: [number, number],
  routes: Route[]
): PathResult {
  const peatonalRoutes = routes.filter(r => r.type === 'peatonal' || r.type === 'accesible')

  if (peatonalRoutes.length === 0) {
    return fallbackStraightLine(origin, destination)
  }

  const graph = buildGraph(peatonalRoutes)

  if (graph.size === 0) {
    return fallbackStraightLine(origin, destination)
  }

  const startNode = findClosestNode(origin, graph)
  const endNode = findClosestNode(destination, graph)

  if (!startNode || !endNode || startNode.distance > 300 || endNode.distance > 300) {
    return fallbackStraightLine(origin, destination)
  }

  const result = dijkstra(graph, startNode.key, endNode.key)

  if (!result) {
    return fallbackStraightLine(origin, destination)
  }

  // Reconstruir puntos del camino
  const path: Array<[number, number]> = [origin]

  // Agregar cada nodo del camino
  for (const key of result.path) {
    const [lat, lng] = key.split(',').map(Number)
    path.push([lat, lng])
  }

  path.push(destination)

  // Distancia total: tramo al inicio + ruta + tramo al final
  const totalDistance = startNode.distance + result.distance + endNode.distance

  return { path, distance: totalDistance, usedRoutes: true }
}

function fallbackStraightLine(origin: [number, number], destination: [number, number]): PathResult {
  const straight = haversine(origin[0], origin[1], destination[0], destination[1])
  return {
    path: [origin, destination],
    distance: straight * 1.3,
    usedRoutes: false,
  }
}
