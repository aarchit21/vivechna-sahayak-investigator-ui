import { describe, expect, it } from 'vitest'
import procedures from '../data/sanand-procedures.json'
import { activeSteps, areaForStep, countByTier, suggestedModules } from './investigation'
import { isAction, nextAction, orderWorkflow, workflowSections, workflowStatus } from './workflow'
import { createDemoAdapter } from './backend'
import type { CasePayload, InvestigationStep, TaskProgress } from '../types'

const data = procedures as unknown as CasePayload
const completed: TaskProgress = { done: true, completedTickIds: [], version: 1 }

describe('Sanand procedural import', () => {
  it('retains all 854 unique IDs, source references and original priorities', () => {
    expect(data.steps).toHaveLength(854)
    expect(new Set(data.steps.map(s => s.id)).size).toBe(854)
    expect(countByTier(data.steps)).toEqual({ MUST_DO: 335, SHOULD_DO: 276, REFERENCE: 243 })
    expect(data.steps.reduce((count, s) => count + (s.sources?.length || 0), 0)).toBe(1991)
    // The source uses both catalogue keys and the filename BSA.pdf as IDs.
    expect(data.steps.every(s => s.sources?.every(source => !!data.documents[source.document] || Object.values(data.documents).some(document => document.file === source.document)))).toBe(true)
    expect(data.fir.fields).toEqual([])
    expect(data.fir_text).toBe('')
    expect(data.steps.find(s => s.id === 'core-chargesheet-closure-two-month-sexual-offence-deadline')?.title).toContain('two months')
  })

  it('suggests relevant sections without activating extra steps', () => {
    expect(suggestedModules(data)).toEqual(['sexual', 'children', 'trafficking', 'cyber'])
    const general = activeSteps(data.steps, [])
    expect(general.every(s => areaForStep(s) === 'core')).toBe(true)
    expect(general.some(s => s.id === 'core-registration-rape-victim-statement-place')).toBe(false)
    const withSexual = activeSteps(data.steps, ['sexual'])
    expect(withSexual.some(s => s.id === 'core-registration-rape-victim-statement-place')).toBe(true)
    expect(withSexual.every(s => ['core', 'sexual'].includes(areaForStep(s)))).toBe(true)
  })

  it('partitions every imported step without duplication or omission', () => {
    const sections = workflowSections(data.steps, ['heinous', 'murder', 'theft', 'sexual', 'children', 'trafficking', 'cyber'])
    const all = [...sections.general, ...sections.specific, ...sections.other]
    expect(all).toHaveLength(data.steps.length)
    expect(new Set(all.map(s => s.id)).size).toBe(data.steps.length)
  })
})

describe('guided workflow progress', () => {
  it('orders source phases, recommends outstanding actions and advances on completion', () => {
    const active = activeSteps(data.steps, [])
    const next = nextAction(active, {}, data.group_order)!
    expect(next.phase).toBe('now')
    expect(next.triage).toBe('MUST_DO')
    expect(nextAction(active, { [next.id]: completed }, data.group_order)?.id).not.toBe(next.id)
    expect(nextAction(active, Object.fromEntries(active.filter(isAction).map(s => [s.id, completed])), data.group_order)).toBeUndefined()
    expect(orderWorkflow(active, data.group_order).at(-1)?.phase).toBe('later')
  })

  it('distinguishes current, completed, pending and optional reading without downgrading should-do actions', () => {
    const step = data.steps.find(isAction)!
    expect(workflowStatus(step, {}, step.id)).toBe('current')
    expect(workflowStatus(step, { [step.id]: completed }, step.id)).toBe('completed')
    expect(workflowStatus(step, {})).toBe('pending')
    expect(workflowStatus({ ...step, triage: 'REFERENCE' } as InvestigationStep, {})).toBe('optional')
    expect(workflowStatus({ ...step, triage: 'SHOULD_DO' } as InvestigationStep, {})).toBe('pending')
  })

  it('keeps completion and confirmed modules isolated by case across navigation', async () => {
    const demo = createDemoAdapter()
    const first = '11192011260307-2026', second = '11192050250093-2025'
    await demo.load(first); await demo.load(second)
    const stepId = data.steps[0].id
    await demo.saveTask(second, stepId, completed)
    await demo.saveModules(second, ['sexual'], 0)
    expect((await demo.load(first)).progress[stepId]).toBeUndefined()
    expect((await demo.load(first)).confirmedModules).toEqual([])
    expect((await demo.load(second)).progress[stepId].done).toBe(true)
    expect((await demo.load(second)).confirmedModules).toEqual(['sexual'])
  })
})
