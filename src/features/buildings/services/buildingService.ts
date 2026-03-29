import { api } from '@/shared/lib/api';
import type { Building, BuildingCreate, BuildingUpdate } from '../types';

export const buildingService = {
  async getAll(): Promise<Building[]> {
    const response = await api.get('/edificios.php');
    return response.data.data;
  },

  async getById(id: string): Promise<Building> {
    const response = await api.get(`/edificios.php?id=${id}`);
    return response.data.data;
  },

  async create(data: BuildingCreate): Promise<Building> {
    const response = await api.post('/edificios.php', data);
    return response.data.data;
  },

  async update(data: BuildingUpdate): Promise<Building> {
    const response = await api.put('/edificios.php', data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/edificios.php?id=${id}`);
  },
};
