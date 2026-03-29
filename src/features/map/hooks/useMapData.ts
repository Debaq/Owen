import { useState, useEffect } from 'react';
import { getPOIs, getRoutes, getMapAreas } from '../services/mapService';
import { getAllBuildings } from '@/features/rooms/services/roomService';
import { getAllRooms } from '@/features/rooms/services/roomService';
import type { POI, Route, MapArea } from '../types';
import type { Edificio } from '@/shared/types/models';
import type { Sala } from '@/shared/types/models';

export interface MapData {
  pois: POI[];
  routes: Route[];
  areas: MapArea[];
  edificios: Edificio[];
  salas: Sala[];
  loading: boolean;
  error: string | null;
}

export function useMapData() {
  const [data, setData] = useState<MapData>({
    pois: [],
    routes: [],
    areas: [],
    edificios: [],
    salas: [],
    loading: true,
    error: null,
  });

  const loadMapData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [pois, routes, areas, edificios, salas] = await Promise.all([
        getPOIs().catch(() => []),
        getRoutes().catch(() => []),
        getMapAreas().catch(() => []),
        getAllBuildings().catch(() => []),
        getAllRooms().catch(() => []),
      ]);

      setData({
        pois,
        routes,
        areas,
        edificios,
        salas,
        loading: false,
        error: null,
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar datos del mapa',
      }));
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  return { ...data, reload: loadMapData };
}
