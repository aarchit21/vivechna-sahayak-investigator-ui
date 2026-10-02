import { areaForStep, PHASES } from './investigation'
import type { InvestigationStep, ModuleId, TaskProgress } from '../types'

export type WorkflowStatus = 'completed' | 'current' | 'pending' | 'optional'
export const isAction = (step: InvestigationStep) => step.triage !== 'REFERENCE'

// A navigation order, not a legal dependency or a new deadline.
export function orderWorkflow(steps: InvestigationStep[], groupOrder: string[] = []) {
  return steps.slice().sort((a, b) => {
    const phase = PHASES.findIndex(p => p.id === a.phase) - PHASES.findIndex(p => p.id === b.phase)
    const groupIndex = (group: string) => { const index = groupOrder.indexOf(group); return index < 0 ? groupOrder.length : index }
    const tierIndex = (step: InvestigationStep) => ['MUST_DO', 'SHOULD_DO', 'REFERENCE'].indexOf(step.triage)
    return phase || groupIndex(a.group) - groupIndex(b.group) || tierIndex(a) - tierIndex(b)
  })
}

export function nextAction(steps: InvestigationStep[], progress: Record<string, TaskProgress>, groupOrder?: string[]) {
  const ordered = orderWorkflow(steps, groupOrder).filter(s => isAction(s) && !progress[s.id]?.done)
  const firstPhase = ordered[0]?.phase
  return ordered.find(s => s.phase === firstPhase && s.triage === 'MUST_DO') || ordered[0]
}

export function workflowStatus(step: InvestigationStep, progress: Record<string, TaskProgress>, nextId?: string): WorkflowStatus {
  if (progress[step.id]?.done) return 'completed'
  if (!isAction(step)) return 'optional'
  return step.id === nextId ? 'current' : 'pending'
}

export function workflowSections(steps: InvestigationStep[], modules: ModuleId[]) {
  return {
    general: steps.filter(s => areaForStep(s) === 'core'),
    specific: steps.filter(s => { const area = areaForStep(s); return area !== 'core' && area !== 'library' && modules.includes(area) }),
    other: steps.filter(s => areaForStep(s) === 'library'),
  }
}
