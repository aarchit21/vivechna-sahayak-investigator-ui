export type Phase = 'now' | '24h' | 'week' | 'later'
export type Tier = 'MUST_DO' | 'SHOULD_DO' | 'REFERENCE'
export type ModuleId = 'heinous' | 'murder' | 'theft'
export type StepArea = 'core' | ModuleId | 'library'

export interface FirField {
  k: string
  v: string
  span?: string
}

export interface FirRecord {
  fir_number: string
  police_station: string
  sections_stated: string[]
  fields: FirField[]
  data_quality_warnings: string[]
  narrative_summary?: string
  raw?: unknown
}

export interface StepSource {
  document: string
  citation: string
  authority?: string
  file?: string
  section?: string
  page?: number | null
  role?: string
}

export interface StepDetail {
  text: string
  citation?: string
  document?: string
  section?: string
  page?: number | null
}

export interface StepTick {
  do: string
  sub?: string[]
}

export interface InvestigationStep {
  id: string
  title?: string
  text: string
  phase: Phase
  triage: Tier
  group: string
  stage?: string
  authority?: string
  legal_basis?: string[]
  deadline?: string | null
  responsible?: string | null
  applies_when?: string | null
  note?: string | null
  triage_why?: string
  ticks?: StepTick[]
  details?: StepDetail[]
  sources?: StepSource[]
  conflicts?: unknown[]
}

export interface SourceDocument {
  citation: string
  file?: string
  authority?: string
  page_convention?: string
}

export interface CasePayload {
  fir: FirRecord
  fir_text: string
  steps: InvestigationStep[]
  documents: Record<string, SourceDocument>
  routing: { crime_types: string[]; sections: string[] }
  routing_warnings?: string[]
  group_order?: string[]
}

export interface TaskProgress {
  done: boolean
  completedTickIds: string[]
  version: number
}

export interface InvestigationRecord {
  case: CasePayload
  confirmedModules: ModuleId[]
  modulesVersion: number
  progress: Record<string, TaskProgress>
}
