import { api } from '@/shared/lib/api';
import type { POI, Route, MapArea } from '../types';

// POIs
export const getPOIs = async (): Promise<POI[]> => {
  const response = await api.get('/pois.php');
  return response.data.data;
};

export const getPOI = async (id: string): Promise<POI> => {
  const response = await api.get(`/pois.php?action=get&id=${id}`);
  return response.data.data;
};

export const createPOI = async (data: Partial<POI>): Promise<string> => {
  const response = await api.post('/pois.php', data);
  return response.data.id;
};

export const updatePOI = async (data: POI): Promise<void> => {
  await api.post('/pois.php?action=update', data);
};

export const deletePOI = async (id: string): Promise<void> => {
  await api.post('/pois.php?action=delete', { id });
};

// Rutas
export const getRoutes = async (): Promise<Route[]> => {
  const response = await api.get('/routes.php');
  return response.data.data;
};

export const createRoute = async (data: Partial<Route>): Promise<string> => {
  const response = await api.post('/routes.php', data);
  return response.data.id;
};

export const updateRoute = async (data: Route): Promise<void> => {
  await api.post('/routes.php?action=update', data);
};

export const deleteRoute = async (id: string): Promise<void> => {
  await api.post('/routes.php?action=delete', { id });
};

// Áreas del mapa
export const getMapAreas = async (): Promise<MapArea[]> => {
  const response = await api.get('/map-areas.php');
  return response.data.data;
};

export const createMapArea = async (data: Partial<MapArea>): Promise<string> => {
  const response = await api.post('/map-areas.php', data);
  return response.data.id;
};

export const updateMapArea = async (data: MapArea): Promise<void> => {
  await api.post('/map-areas.php?action=update', data);
};

export const deleteMapArea = async (id: string): Promise<void> => {
  await api.post('/map-areas.php?action=delete', { id });
};
