// Tipos de puntos de interés en el campus
export type POICategory =
  | 'estacionamiento'
  | 'baño'
  | 'biblioteca'
  | 'cafeteria'
  | 'acceso'
  | 'paradero'
  | 'bicicletas'
  | 'enfermeria'
  | 'seguridad'
  | 'wi-fi'
  | 'extinguidor'
  | 'salida_emergencia'
  | 'ascensor'
  | 'escalera'
  | 'area_verde'
  | 'patio'
  | 'gimnasio'
  | 'auditorio'
  | 'otro';

export interface POI {
  id: string;
  category: POICategory;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  icon?: string; // emoji o nombre de icono
  color?: string; // color del marcador
  edificio_id?: string; // opcional, si está asociado a un edificio
  activo: boolean;
  metadata?: Record<string, any>; // datos extra (ej: capacidad de estacionamiento, género de baño)
  created_at?: string;
  updated_at?: string;
}

// Rutas/Caminos entre puntos
export interface Route {
  id: string;
  name: string;
  description?: string;
  from_poi_id?: string;
  to_poi_id?: string;
  points: Array<[number, number]>; // array de coordenadas [lat, lng]
  type: 'peatonal' | 'vehicular' | 'bicicleta' | 'accesible'; // accesible = rampa para sillas de ruedas
  color: string;
  width: number; // grosor de la línea
  activo: boolean;
  created_at?: string;
}

// Áreas/Polígonos en el mapa
export interface MapArea {
  id: string;
  name: string;
  description?: string;
  type: 'estacionamiento' | 'zona_verde' | 'patio' | 'cancha' | 'restringida' | 'otro';
  coordinates: Array<[number, number]>; // polígono cerrado
  color: string;
  fillOpacity: number;
  activo: boolean;
  created_at?: string;
}

// Configuración visual de categorías
export interface POICategoryConfig {
  category: POICategory;
  label: string;
  icon: string; // emoji
  color: string;
  defaultVisible: boolean;
}

export const POI_CATEGORIES_CONFIG: POICategoryConfig[] = [
  { category: 'estacionamiento', label: 'Estacionamiento', icon: '🅿️', color: '#3b82f6', defaultVisible: true },
  { category: 'baño', label: 'Baño', icon: '🚻', color: '#8b5cf6', defaultVisible: true },
  { category: 'biblioteca', label: 'Biblioteca', icon: '📚', color: '#10b981', defaultVisible: true },
  { category: 'cafeteria', label: 'Cafetería', icon: '☕', color: '#f59e0b', defaultVisible: true },
  { category: 'acceso', label: 'Acceso/Entrada', icon: '🚪', color: '#ef4444', defaultVisible: true },
  { category: 'paradero', label: 'Paradero', icon: '🚌', color: '#06b6d4', defaultVisible: true },
  { category: 'bicicletas', label: 'Estacionamiento Bicicletas', icon: '🚲', color: '#84cc16', defaultVisible: true },
  { category: 'enfermeria', label: 'Enfermería', icon: '🏥', color: '#ec4899', defaultVisible: true },
  { category: 'seguridad', label: 'Seguridad', icon: '🛡️', color: '#6366f1', defaultVisible: true },
  { category: 'wi-fi', label: 'Zona Wi-Fi', icon: '📶', color: '#14b8a6', defaultVisible: false },
  { category: 'extinguidor', label: 'Extinguidor', icon: '🧯', color: '#dc2626', defaultVisible: false },
  { category: 'salida_emergencia', label: 'Salida de Emergencia', icon: '🚨', color: '#f97316', defaultVisible: false },
  { category: 'ascensor', label: 'Ascensor', icon: '🛗', color: '#64748b', defaultVisible: false },
  { category: 'escalera', label: 'Escalera', icon: '🪜', color: '#71717a', defaultVisible: false },
  { category: 'area_verde', label: 'Área Verde', icon: '🌳', color: '#22c55e', defaultVisible: true },
  { category: 'patio', label: 'Patio', icon: '🏛️', color: '#a3e635', defaultVisible: true },
  { category: 'gimnasio', label: 'Gimnasio', icon: '🏋️', color: '#f43f5e', defaultVisible: true },
  { category: 'auditorio', label: 'Auditorio', icon: '🎭', color: '#a855f7', defaultVisible: true },
  { category: 'otro', label: 'Otro', icon: '📍', color: '#6b7280', defaultVisible: true },
];

// Helpers
export function getPOICategoryConfig(category: POICategory): POICategoryConfig {
  return POI_CATEGORIES_CONFIG.find(c => c.category === category) || POI_CATEGORIES_CONFIG[POI_CATEGORIES_CONFIG.length - 1];
}
