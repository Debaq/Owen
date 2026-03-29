import * as L from 'leaflet'

declare module 'leaflet' {
  namespace Routing {
    interface RoutingControlOptions {
      waypoints: L.LatLng[]
      router?: any
      routeWhileDragging?: boolean
      showAlternatives?: boolean
      show?: boolean
      addWaypoints?: boolean
      fitSelectedRoutes?: boolean | string
      lineOptions?: {
        styles?: Array<{
          color?: string
          weight?: number
          opacity?: number
          dashArray?: string
        }>
        addWaypoints?: boolean
      }
      createMarker?: (i: number, waypoint: any, n: number) => L.Marker | null
    }

    interface RouteSummary {
      totalDistance: number
      totalTime: number
    }

    interface Route {
      summary: RouteSummary
      coordinates: L.LatLng[]
      name: string
    }

    interface RoutingEvent {
      routes: Route[]
    }

    interface RoutingErrorEvent {
      error: { status: number; message: string }
    }

    interface Control extends L.Control {
      setWaypoints(waypoints: L.LatLng[]): this
      getWaypoints(): any[]
      getPlan(): any
      on(event: 'routesfound', fn: (e: RoutingEvent) => void): this
      on(event: 'routingerror', fn: (e: RoutingErrorEvent) => void): this
      remove(): this
    }

    function control(options: RoutingControlOptions): Control

    interface OSRMv1Options {
      serviceUrl?: string
      profile?: string
    }

    function osrmv1(options?: OSRMv1Options): any
  }
}

declare module 'leaflet-routing-machine' {
  export = L.Routing
}
