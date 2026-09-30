import type { CasePayload, InvestigationStep, ModuleId, Phase, StepArea, Tier } from '../types'

export const PHASES: { id: Phase; label: string; description: string }[] = [
  { id: 'now', label: 'Right now', description: 'First response and scene' },
  { id: '24h', label: 'Within 24 hours', description: 'Early evidence and procedure' },
  { id: 'week', label: 'This week', description: 'Statements and follow-up' },
  { id: 'later', label: 'Before charge sheet', description: 'Review and court preparation' },
]

export const TIERS: { id: Tier; label: string }[] = [
  { id: 'MUST_DO', label: 'Must do' },
  { id: 'SHOULD_DO', label: 'Should do' },
  { id: 'REFERENCE', label: 'Reference' },
]

export const MODULES: { id: ModuleId; label: string; description: string; short: string }[] = [
  { id: 'heinous', label: 'Heinous Crime', short: 'Heinous', description: 'Extra supervision and case handling for serious offences.' },
  { id: 'murder', label: 'Murder', short: 'Murder', description: 'Death investigation, inquest and related evidence steps.' },
  { id: 'theft', label: 'Theft', short: 'Theft', description: 'Property crime steps, including clearly marked robbery work.' },
]

// Curated IDs are the only serious-crime additions in the imported case that
// explicitly describe a distinct serious/heinous procedure. The scene-sketch
// addendum is shown as a linked shared step, not duplicated as a new duty.
const HEINOUS_IDS = new Set([
  'core-documentation-supervision-trained-io-allocation',
  'core-documentation-supervision-special-report-cases',
  'core-documentation-supervision-heinous-supervision-participation',
])

const THEFT_REFERENCE_IDS = new Set(['bsa-56-evidence', 'bsa-119-evidence'])

export function areaForStep(step: InvestigationStep): StepArea {
  if (HEINOUS_IDS.has(step.id)) return 'heinous'
  if (step.id.startsWith('module-deaths-') || step.group === 'The body: inquest and post-mortem') return 'murder'
  if (step.id.startsWith('module-property-') || step.id.includes('forensic-theft-burglary') || THEFT_REFERENCE_IDS.has(step.id)) return 'theft'
  if (step.id.startsWith('module-') || step.group === 'Forensic examination by crime type') return 'library'
  return 'core'
}

export function suggestedModules(data: CasePayload): ModuleId[] {
  const sections = data.fir.sections_stated.join(' ').toUpperCase()
  const route = data.routing.crime_types.join(' ').toLowerCase()
  const suggested = new Set<ModuleId>()
  if (/BNS\s*103\s*\(/.test(sections) || route.includes('murder')) {
    suggested.add('murder')
    suggested.add('heinous')
  }
  if (/BNS\s*309\s*\(/.test(sections) || /theft|robbery|dacoity/.test(route)) suggested.add('theft')
  return MODULES.map((module) => module.id).filter((id) => suggested.has(id))
}

export function activeSteps(steps: InvestigationStep[], modules: ModuleId[]): InvestigationStep[] {
  return steps.filter((step) => {
    const area = areaForStep(step)
    return area === 'core' || (area !== 'library' && modules.includes(area))
  })
}

export function displayTitle(step: InvestigationStep): string {
  return step.title?.trim() || step.text.split(/[.;:]/)[0]?.trim() || 'Untitled step'
}

export function isRobberyStep(step: InvestigationStep): boolean {
  return /robbery|dacoity|loot/i.test([step.title, step.text, step.id].join(' '))
}

export function searchableText(step: InvestigationStep): string {
  return [step.title, step.text, step.group, step.stage, step.responsible, step.deadline,
    ...(step.legal_basis || []), ...(step.sources || []).map((source) => `${source.citation} ${source.section || ''}`)]
    .filter(Boolean).join(' ').toLocaleLowerCase()
}

export function countByTier(steps: InvestigationStep[]) {
  return steps.reduce<Record<Tier, number>>((count, step) => {
    count[step.triage] += 1
    return count
  }, { MUST_DO: 0, SHOULD_DO: 0, REFERENCE: 0 })
}
