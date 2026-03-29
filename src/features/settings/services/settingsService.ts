import { api } from '@/shared/lib/api';
import { Carrera, Nivel, Asignatura, Docente, UnidadAcademica, User, BloqueHorario, SistemaBloque } from '@/shared/types/models';

// --- Carreras ---
export const getCarreras = async (): Promise<Carrera[]> => {
  const response = await api.get('/carreras.php');
  return response.data.data;
};

export const createCarrera = async (data: Partial<Carrera>): Promise<Carrera> => {
  const response = await api.post('/carreras.php?action=create', data);
  return response.data.data;
};

export const updateCarrera = async (id: string, data: Partial<Carrera>): Promise<void> => {
  await api.post(`/carreras.php?action=update&id=${id}`, data);
};

export const deleteCarrera = async (id: string): Promise<void> => {
  await api.post(`/carreras.php?action=delete&id=${id}`);
};

// --- Niveles ---
export const getNiveles = async (carreraId?: string): Promise<Nivel[]> => {
  const url = carreraId ? `/niveles.php?carrera_id=${carreraId}` : '/niveles.php';
  const response = await api.get(url);
  return response.data.data;
};

export const createNivel = async (data: Partial<Nivel>): Promise<Nivel> => {
  const response = await api.post('/niveles.php?action=create', data);
  return response.data.data;
};

export const massCreateNiveles = async (carreraId: string, niveles: Partial<Nivel>[]): Promise<void> => {
  await api.post('/niveles.php?action=mass_create', { carrera_id: carreraId, niveles });
};

export const updateNivel = async (id: string, data: Partial<Nivel>): Promise<void> => {
  await api.post(`/niveles.php?action=update&id=${id}`, data);
};

export const deleteNivel = async (id: string): Promise<void> => {
  await api.post(`/niveles.php?action=delete&id=${id}`);
};

// --- Asignaturas ---
export const getAsignaturas = async (nivelId?: string): Promise<Asignatura[]> => {
  const url = nivelId ? `/asignaturas.php?nivel_id=${nivelId}` : '/asignaturas.php';
  const response = await api.get(url);
  return response.data.data;
};

export const createAsignatura = async (data: Partial<Asignatura>): Promise<Asignatura> => {
  const response = await api.post('/asignaturas.php?action=create', data);
  return response.data.data;
};

export const updateAsignatura = async (id: string, data: Partial<Asignatura>): Promise<void> => {
  await api.post(`/asignaturas.php?action=update&id=${id}`, data);
};

export const deleteAsignatura = async (id: string): Promise<void> => {
  await api.post(`/asignaturas.php?action=delete&id=${id}`);
};

// --- Docentes y Asignaturas (Asignación) ---
export interface DocenteAsignatura {
  id: string;
  docente_id: string;
  asignatura_id: string;
  rol: 'responsable' | 'colaborador';
  docente_name?: string;
  docente_rut?: string;
}

export const getDocentesAsignatura = async (asignaturaId: string): Promise<DocenteAsignatura[]> => {
  const response = await api.get(`/docente_asignaturas.php?asignatura_id=${asignaturaId}`);
  return response.data.data;
};

export const assignDocenteAsignatura = async (data: { docente_id: string, asignatura_id: string, rol: string }): Promise<void> => {
  await api.post('/docente_asignaturas.php?action=assign', data);
};

export const unassignDocenteAsignatura = async (id: string): Promise<void> => {
  await api.post(`/docente_asignaturas.php?action=unassign&id=${id}`);
};

// --- Unidades Académicas ---
export const getUnidades = async (): Promise<UnidadAcademica[]> => {
  const response = await api.get('/unidades.php');
  return response.data.data;
};

export const createUnidad = async (data: Partial<UnidadAcademica>): Promise<UnidadAcademica> => {
  const response = await api.post('/unidades.php?action=create', data);
  return response.data.data;
};

export const updateUnidad = async (id: string, data: Partial<UnidadAcademica>): Promise<void> => {
  await api.post(`/unidades.php?action=update&id=${id}`, data);
};

export const deleteUnidad = async (id: string): Promise<void> => {
  await api.post(`/unidades.php?action=delete&id=${id}`);
};

// --- Docentes ---
export const getDocentes = async (activo?: boolean, unidadId?: string): Promise<Docente[]> => {
  let url = '/docentes.php?';
  if (activo !== undefined) url += `activo=${activo ? 1 : 0}&`;
  if (unidadId) url += `unidad_id=${unidadId}&`;
  const response = await api.get(url);
  return response.data.data;
};

export const createDocente = async (data: Partial<Docente>): Promise<Docente> => {
  const response = await api.post('/docentes.php?action=create', data);
  return response.data.data;
};

export const updateDocente = async (id: string, data: Partial<Docente>): Promise<void> => {
  await api.post(`/docentes.php?action=update&id=${id}`, data);
};

export const deleteDocente = async (id: string): Promise<void> => {
  await api.post(`/docentes.php?action=delete&id=${id}`);
};

export const activateDocente = async (id: string): Promise<void> => {
  await api.post(`/docentes.php?action=activate&id=${id}`);
};

// --- Sistemas de Bloques ---
export const getSistemasBloques = async (): Promise<SistemaBloque[]> => {
  const response = await api.get('/sistemas_bloques.php');
  return response.data.data;
};

export const createSistemaBloque = async (nombre: string): Promise<SistemaBloque> => {
  const response = await api.post('/sistemas_bloques.php?action=create', { nombre });
  return response.data.data;
};

export const deleteSistemaBloque = async (id: string): Promise<void> => {
  await api.post(`/sistemas_bloques.php?action=delete&id=${id}`);
};

// --- Bloques Horarios ---
export const getBloques = async (sistemaId?: string): Promise<BloqueHorario[]> => {
  const url = sistemaId ? `/bloques.php?sistema_bloque_id=${sistemaId}` : '/bloques.php';
  const response = await api.get(url);
  return response.data.data;
};

export const createBloque = async (data: Partial<BloqueHorario>): Promise<void> => {
  await api.post('/bloques.php?action=create', data);
};

export const massCreateBloques = async (sistemaId: string, bloques: Partial<BloqueHorario>[]): Promise<void> => {
  await api.post('/bloques.php?action=mass_create', { sistema_bloque_id: sistemaId, bloques });
};

export const updateBloque = async (id: string, data: Partial<BloqueHorario>): Promise<void> => {
  await api.post(`/bloques.php?action=update&id=${id}`, data);
};

export const deleteBloque = async (id: string): Promise<void> => {
  await api.post(`/bloques.php?action=delete&id=${id}`);
};

export const deleteBloquesByDay = async (sistemaId: string, dia: number): Promise<void> => {
  await api.post('/bloques.php?action=delete_day', { sistema_bloque_id: sistemaId, dia_semana: dia });
};

// --- Disponibilidad Docente ---
export const getDocenteDisponibilidad = async (docenteId: string): Promise<{dia_semana: number, bloque_id: string}[]> => {
  const response = await api.get(`/docente_disponibilidad.php?docente_id=${docenteId}`);
  return response.data.data;
};

export const saveDocenteDisponibilidad = async (docenteId: string, items: {dia_semana: number, bloque_id: string}[]): Promise<void> => {
  await api.post('/docente_disponibilidad.php?action=save', { docente_id: docenteId, items });
};

// --- Usuarios ---
export const getUsers = async (): Promise<Partial<User>[]> => {
  const response = await api.get('/users.php');
  return response.data.data;
};

// --- Carga de Imágenes ---
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/upload.php', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data.url;
};

// --- Configuracion del Sistema ---
export type SystemConfig = Record<string, string>;

export const getSystemConfig = async (): Promise<SystemConfig> => {
  const response = await api.get('/system-config.php');
  return response.data.data || {};
};

export const getPublicConfig = async (): Promise<SystemConfig> => {
  const response = await api.get('/system-config.php?public=1');
  return response.data.data || {};
};

export const saveSystemConfig = async (config: Partial<SystemConfig>): Promise<void> => {
  await api.post('/system-config.php', config);
};

export const testTelegram = async (): Promise<string> => {
  const response = await api.post('/system-config.php?action=test_telegram');
  return response.data.message;
};

export const testEmail = async (): Promise<string> => {
  const response = await api.post('/system-config.php?action=test_email');
  return response.data.message;
};