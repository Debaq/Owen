import { api } from '@/shared/lib/api'
import type {
  ApiResponse,
  HorarioBranch,
  HorarioCommit,
  HorarioTag,
  HorarioDiff,
  HorarioAsignacion,
} from '@/shared/types'

// --- Branches ---

export const getBranches = async (temporadaId: string): Promise<HorarioBranch[]> => {
  const response = await api.get<ApiResponse<HorarioBranch[]>>(`/branches.php?temporada_id=${temporadaId}`)
  return response.data.data || []
}

export const getBranch = async (id: string): Promise<HorarioBranch> => {
  const response = await api.get<ApiResponse<HorarioBranch>>(`/branches.php?id=${id}`)
  return response.data.data!
}

export const createBranch = async (data: {
  temporada_id: string
  nombre: string
  descripcion?: string
  branch_padre_id?: string
  commit_padre_id?: string
}): Promise<{ id: string; es_principal: boolean }> => {
  const response = await api.post<ApiResponse<{ id: string; es_principal: boolean }>>('/branches.php?action=create', data)
  return response.data.data!
}

export const updateBranch = async (id: string, data: {
  nombre?: string
  descripcion?: string
  estado?: HorarioBranch['estado']
}): Promise<void> => {
  await api.post(`/branches.php?action=update&id=${id}`, data)
}

export const deleteBranch = async (id: string): Promise<void> => {
  await api.post(`/branches.php?action=delete&id=${id}`)
}

// --- Commits ---

export const getCommits = async (branchId: string): Promise<HorarioCommit[]> => {
  const response = await api.get<ApiResponse<HorarioCommit[]>>(`/commits.php?branch_id=${branchId}`)
  return response.data.data || []
}

export const getCommit = async (id: string, includeAsignaciones = false): Promise<HorarioCommit> => {
  const params = includeAsignaciones ? '&include_asignaciones=true' : ''
  const response = await api.get<ApiResponse<HorarioCommit>>(`/commits.php?id=${id}${params}`)
  return response.data.data!
}

export const createCommit = async (data: {
  branch_id: string
  mensaje: string
  tipo: HorarioCommit['tipo']
  metadata?: Record<string, unknown>
  asignaciones?: Partial<HorarioAsignacion>[]
}): Promise<{ commit_id: string; total_asignaciones: number; score_global: number | null }> => {
  const response = await api.post<ApiResponse<{ commit_id: string; total_asignaciones: number; score_global: number | null }>>('/commits.php?action=create', data)
  return response.data.data!
}

// --- Tags ---

export const getTags = async (temporadaId: string): Promise<HorarioTag[]> => {
  const response = await api.get<ApiResponse<HorarioTag[]>>(`/tags.php?temporada_id=${temporadaId}`)
  return response.data.data || []
}

export const createTag = async (data: {
  commit_id: string
  nombre: string
  descripcion?: string
}): Promise<string> => {
  const response = await api.post<ApiResponse<{ id: string }>>('/tags.php?action=create', data)
  return response.data.data!.id
}

export const deleteTag = async (id: string): Promise<void> => {
  await api.post(`/tags.php?action=delete&id=${id}`)
}

// --- Diff ---

export const getDiffByCommits = async (commitA: string, commitB: string): Promise<HorarioDiff> => {
  const response = await api.get<ApiResponse<HorarioDiff>>(`/diff.php?commit_a=${commitA}&commit_b=${commitB}`)
  return response.data.data!
}

export const getDiffByBranches = async (branchA: string, branchB: string): Promise<HorarioDiff> => {
  const response = await api.get<ApiResponse<HorarioDiff>>(`/diff.php?branch_a=${branchA}&branch_b=${branchB}`)
  return response.data.data!
}

// --- Merge ---

export interface MergeResult {
  commit_id: string
  total_asignaciones: number
  conflicts_resolved: number
  score_global: number | null
}

export interface MergeConflict {
  sesion_id: string
  source: HorarioAsignacion
  target: HorarioAsignacion
}

export interface MergeResponse {
  success: boolean
  data?: MergeResult
  conflicts?: MergeConflict[]
  conflicts_count?: number
  message?: string
}

export const mergeBranches = async (data: {
  source_branch_id: string
  target_branch_id: string
  mensaje: string
  strategy: 'source_wins' | 'target_wins' | 'manual'
  resoluciones?: Array<{ sesion_id: string; elegir: 'source' | 'target' }>
}): Promise<MergeResponse> => {
  const response = await api.post<MergeResponse>('/merge.php?action=merge', data)
  return response.data
}

// --- Rollback ---

export const rollback = async (data: {
  branch_id: string
  target_commit_id: string
  mensaje?: string
}): Promise<{ commit_id: string; total_asignaciones: number }> => {
  const response = await api.post<ApiResponse<{ commit_id: string; rollback_to: string; total_asignaciones: number }>>('/rollback.php', data)
  return response.data.data!
}
