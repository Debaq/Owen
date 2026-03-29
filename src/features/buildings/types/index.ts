export interface Building {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  pisos: number;
  descripcion?: string;
  created_at: string;
}

export interface BuildingFormData {
  name: string;
  code: string;
  lat: number;
  lng: number;
  pisos: number;
  descripcion?: string;
}

export interface BuildingCreate extends BuildingFormData {}

export interface BuildingUpdate extends Partial<BuildingFormData> {
  id: string;
}
