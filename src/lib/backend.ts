import importedCase from '../data/case.json'
import type { CasePayload, InvestigationRecord, ModuleId, TaskProgress } from '../types'

export interface InvestigationAdapter {
  load(caseId: string): Promise<InvestigationRecord>
  saveModules(caseId: string, modules: ModuleId[], version: number): Promise<{ confirmedModules: ModuleId[]; version: number }>
  saveTask(caseId: string, stepId: string, progress: TaskProgress): Promise<TaskProgress>
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function createDemoAdapter(): InvestigationAdapter {
  return {
    async load() {
      return { case: importedCase as unknown as CasePayload, confirmedModules: [], modulesVersion: 0, progress: {} }
    },
    async saveModules(_caseId, confirmedModules, version) {
      return { confirmedModules, version: version + 1 }
    },
    async saveTask(_caseId, _stepId, progress) {
      return { ...progress, version: progress.version + 1 }
    },
  }
}

export function createApiAdapter(fetcher: typeof fetch = fetch, base = '/api'): InvestigationAdapter {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    let response: Response
    try {
      response = await fetcher(`${base}${path}`, {
        ...init,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      })
    } catch {
      throw new ApiError(0, 'Cannot reach the investigation service. Check your connection and retry.')
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new ApiError(response.status, 'Your session has expired or you do not have access to this case.')
      if (response.status === 409) throw new ApiError(409, 'This case changed elsewhere. Reload before saving again.')
      if (response.status === 404) throw new ApiError(404, 'The requested case or step was not found.')
      throw new ApiError(response.status, 'The investigation service could not complete this request.')
    }
    return response.json() as Promise<T>
  }

  return {
    load: (caseId) => request<InvestigationRecord>(`/cases/${encodeURIComponent(caseId)}/investigation`),
    saveModules: (caseId, modules, version) => request<{ confirmedModules: ModuleId[]; version: number }>(
      `/cases/${encodeURIComponent(caseId)}/modules`,
      { method: 'PUT', body: JSON.stringify({ confirmedModules: modules, version }) },
    ),
    saveTask: (caseId, stepId, progress) => request<TaskProgress>(
      `/cases/${encodeURIComponent(caseId)}/tasks/${encodeURIComponent(stepId)}`,
      { method: 'PATCH', body: JSON.stringify(progress) },
    ),
  }
}

export const isDemoMode = import.meta.env.VITE_DATA_MODE !== 'api'
export const adapter = isDemoMode ? createDemoAdapter() : createApiAdapter()
