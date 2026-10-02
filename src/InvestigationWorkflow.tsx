import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { activeSteps, areaForStep, displayTitle, MODULES, PHASES, searchableText, suggestedModules } from './lib/investigation'
import { isAction, nextAction, orderWorkflow, workflowSections, workflowStatus } from './lib/workflow'
import type { WorkflowStatus } from './lib/workflow'
import type { CasePayload, InvestigationStep, ModuleId, Phase, TaskProgress, Tier } from './types'

type Props = {
  data: CasePayload
  modules: ModuleId[]
  progress: Record<string, TaskProgress>
  busy: boolean
  onModule: (id: ModuleId) => void
  renderStep: (step: InvestigationStep, number: string, status: WorkflowStatus, editable: boolean, focused: boolean) => ReactNode
}

export default function InvestigationWorkflow({ data, modules, progress, busy, onModule, renderStep }: Props) {
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<Phase | 'all'>('all')
  const [priority, setPriority] = useState<Tier | 'actions' | 'all'>('actions')
  const [status, setStatus] = useState<'all' | 'pending' | 'completed' | 'optional'>('all')
  const [focusedId, setFocusedId] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set())
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [showOther, setShowOther] = useState(false)
  const [openModules, setOpenModules] = useState<Set<ModuleId>>(new Set())
  const [otherLimit, setOtherLimit] = useState(10)
  const generalHeading = useRef<HTMLHeadingElement>(null)
  const specificHeading = useRef<HTMLHeadingElement>(null)
  const ordered = useMemo(() => orderWorkflow(data.steps, data.group_order), [data])
  const sections = workflowSections(ordered, modules)
  const active = activeSteps(ordered, modules)
  const actions = active.filter(isAction)
  const done = actions.filter(s => progress[s.id]?.done).length
  const next = nextAction(active, progress, data.group_order)
  const suggestions = suggestedModules(data)
  const relevantModules = MODULES.filter(m => suggestions.includes(m.id) || modules.includes(m.id))
  const matches = (step: InvestigationStep) => {
    const state = workflowStatus(step, progress, next?.id)
    return (phase === 'all' || step.phase === phase)
      && (priority === 'all' || (priority === 'actions' ? isAction(step) : step.triage === priority))
      && (status === 'all' || (status === 'pending' ? state === 'pending' || state === 'current' : status === state))
      && (!query.trim() || searchableText(step).includes(query.trim().toLocaleLowerCase()))
  }
  const filteredCount = ordered.filter(matches).length
  const reset = () => { setQuery(''); setPhase('all'); setPriority('actions'); setStatus('all') }
  const openNext = () => {
    if (!next) return
    reset(); setFocusedId(next.id)
    const key = `${areaForStep(next)}:${next.group}`
    if (areaForStep(next) !== 'core' && areaForStep(next) !== 'library') setOpenModules(old => new Set([...old, areaForStep(next) as ModuleId]))
    setOpenGroups(old => new Set([...old, key]))
    setClosedGroups(old => { const result = new Set(old); result.delete(key); return result })
    // Wait for the stage disclosure to render before moving keyboard focus.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(`workflow-${next.id}`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.focus({ preventScroll: true })
    }))
  }
  const toggleGroup = (key: string, isOpen: boolean) => {
    setOpenGroups(old => { const result = new Set(old); if (isOpen) result.delete(key); else result.add(key); return result })
    setClosedGroups(old => { const result = new Set(old); if (isOpen) result.add(key); else result.delete(key); return result })
  }
  const stages = (steps: InvestigationStep[], area: string, editable: boolean) => {
    const names = [...new Set([...(data.group_order || []), ...steps.map(s => s.group)])].filter(name => steps.some(s => s.group === name))
    const groups = names.map((name, index) => ({ name, index, all: steps.filter(s => s.group === name), visible: steps.filter(s => s.group === name && matches(s)) })).filter(g => g.visible.length)
    if (!groups.length) return <div className="workflow-empty"><strong>No matching steps in this section.</strong><p>Adjust the filters to see more of the source material.</p><button type="button" className="text-button" onClick={reset}>Reset filters</button></div>
    return <div className="workflow-timeline">{groups.map((group, visibleIndex) => {
      const key = `${area}:${group.name}`
      const isOpen = !closedGroups.has(key) && (openGroups.has(key) || visibleIndex === 0 || group.all.some(s => s.id === focusedId))
      const actionable = group.all.filter(isAction)
      const complete = actionable.filter(s => progress[s.id]?.done).length
      const current = editable && group.all.some(s => s.id === next?.id)
      const finished = actionable.length > 0 && complete === actionable.length
      const limit = limits[key] || 6
      return <section className={`workflow-stage ${current ? 'stage-current' : ''} ${finished ? 'stage-complete' : ''}`} key={key}>
        <span className="stage-node" aria-hidden="true">{finished ? '✓' : String(group.index + 1).padStart(2, '0')}</span>
        <div className="stage-panel"><button type="button" className="stage-heading" aria-expanded={isOpen} aria-controls={`stage-${area}-${group.index}`} onClick={() => toggleGroup(key, isOpen)}>
          <span><span className="stage-name">{group.name}</span><span className="stage-caption">{complete} / {actionable.length} actions completed · {group.visible.length} matching steps</span></span>
          <span className="stage-heading-right">{current && <span className="workflow-state current">Current</span>}{finished && <span className="workflow-state completed">Completed</span>}<span aria-hidden="true">{isOpen ? '−' : '+'}</span></span>
        </button>{isOpen && <div className="stage-content" id={`stage-${area}-${group.index}`}>
          {group.visible.slice(0, Math.max(limit, group.visible.findIndex(s => s.id === focusedId) + 1)).map(step => renderStep(step, `${group.index + 1}.${group.all.indexOf(step) + 1}`, workflowStatus(step, progress, next?.id), editable && !busy, step.id === focusedId))}
          {limit < group.visible.length && <button type="button" className="workflow-more" onClick={() => setLimits(old => ({ ...old, [key]: limit + 10 }))}>Show more in this stage <span>{Math.min(limit, group.visible.length)} of {group.visible.length} shown ↓</span></button>}
        </div>}</div>
      </section>
    })}</div>
  }

  return <div className="investigation-workflow">
    <section className="workflow-summary" aria-label="Investigation progress">
      <div><span className="section-label">GUIDED INVESTIGATION</span><h2>{done} <span>of {actions.length} actions completed</span></h2><p>General procedure + confirmed crime-specific steps</p></div>
      <div className="workflow-progress"><strong>{actions.length ? Math.round(done / actions.length * 100) : 0}%</strong><div role="progressbar" aria-label="Investigation completion" aria-valuemin={0} aria-valuemax={actions.length || 1} aria-valuenow={done} className="progress-track"><div className="progress-fill" style={{ width: `${actions.length ? done / actions.length * 100 : 0}%` }} /></div><span>{active.filter(s => !isAction(s)).length} references available separately</span></div>
    </section>
    <section className="workflow-next" aria-label="Next recommended action"><span className="next-icon" aria-hidden="true">→</span><div><span className="section-label">NEXT RECOMMENDED ACTION</span><h2>{next ? displayTitle(next) : 'All active actions completed'}</h2><p>{next ? `${PHASES.find(p => p.id === next.phase)?.label} · ${next.group} · ${next.triage === 'MUST_DO' ? 'Must do' : 'Should do'}` : 'Review the source references and any unconfirmed crime-specific procedures.'}</p>{next && <details><summary>Why this action?</summary><p>{next.triage_why || 'The earliest outstanding action in the source phase and priority order.'}</p></details>}</div>{next && <button type="button" className="primary-button" onClick={openNext}>Review step →</button>}</section>
    <div className="workflow-section-links" aria-label="Workflow sections"><button type="button" onClick={() => { generalHeading.current?.focus(); generalHeading.current?.scrollIntoView({ behavior: 'smooth' }) }}><span>01</span> General investigation <span>↓</span></button><button type="button" onClick={() => { specificHeading.current?.focus(); specificHeading.current?.scrollIntoView({ behavior: 'smooth' }) }}><span>02</span> Crime-specific investigation <span>↓</span></button></div>
    <div className="workflow-filter-panel"><div className="workflow-filters"><div className="search-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search investigation workflow" placeholder="Find a step, action or SOP reference…" value={query} onChange={e => setQuery(e.target.value)} /></div><label>Show<select aria-label="Workflow priority" value={priority} onChange={e => setPriority(e.target.value as typeof priority)}><option value="actions">All actions</option><option value="MUST_DO">Must do</option><option value="SHOULD_DO">Should do</option><option value="REFERENCE">References (optional reading)</option><option value="all">All source material</option></select></label><label>Status<select aria-label="Workflow status" value={status} onChange={e => { const value = e.target.value as typeof status; setStatus(value); if (value === 'optional') setPriority('REFERENCE') }}><option value="all">All statuses</option><option value="pending">Pending / current</option><option value="completed">Completed</option><option value="optional">Optional reading</option></select></label></div>
      <div className="workflow-phase-filter" role="group" aria-label="Workflow phase"><button type="button" aria-pressed={phase === 'all'} onClick={() => setPhase('all')}>All phases</button>{PHASES.map(p => <button type="button" key={p.id} aria-pressed={phase === p.id} onClick={() => setPhase(p.id)}>{p.label}</button>)}</div>
      <div className="workflow-filter-foot"><span>{filteredCount} matching source steps · {data.steps.length} preserved in this workflow</span><button type="button" className="text-button" onClick={reset}>Reset filters</button></div>
    </div>
    <div className="workflow-legend"><span><i className="legend-completed" />Completed</span><span><i className="legend-current" />Current recommendation</span><span><i className="legend-pending" />Pending</span><span><i className="legend-optional" />Optional reference</span></div>
    <p className="workflow-order-note">Numbering guides navigation; investigations may run steps in parallel. Source deadlines and applicability are in each step’s details. No completion is assumed from the FIR.</p>
    <section className="workflow-section"><div className="workflow-section-title"><span className="workflow-section-number">01</span><div><h2 ref={generalHeading} tabIndex={-1}>General Investigation Steps</h2><p>Shared procedures, organized from registration to case preparation.</p></div><span className="result-count">{sections.general.filter(isAction).length} actions</span></div>{stages(sections.general, 'core', true)}</section>
    <section className="workflow-section crime-workflow"><div className="workflow-section-title"><span className="workflow-section-number">02</span><div><h2 ref={specificHeading} tabIndex={-1}>Crime-Specific Investigation Steps</h2><p>Suggested from stated offences and source routing. Confirm applicability to activate progress.</p></div></div>
      <div className="crime-detection"><span className="section-label">STATED OFFENCES</span><div className="section-chips">{data.fir.sections_stated.map(s => <span key={s}>{s}</span>)}</div><small>Routing suggestions are review aids; they do not establish additional offences.</small></div>
      {relevantModules.length ? relevantModules.map(module => {
        const steps = ordered.filter(s => areaForStep(s) === module.id)
        const confirmed = modules.includes(module.id)
        const expanded = openModules.has(module.id) || (!!query.trim() && steps.some(matches))
        return <section className="crime-module" key={module.id}><div className="crime-module-head"><div><span className={`workflow-state ${confirmed ? 'completed' : 'review'}`}>{confirmed ? 'Confirmed for case' : 'Suggested · review needed'}</span><h3>{module.label}</h3><p>{module.description}</p><small>{steps.filter(isAction).length} actions · {steps.filter(s => !isAction(s)).length} references</small></div><div className="crime-module-actions"><button type="button" className="outline-button" aria-expanded={expanded} onClick={() => setOpenModules(old => { const result = new Set(old); if (result.has(module.id)) result.delete(module.id); else result.add(module.id); return result })}>{expanded ? 'Close steps' : 'Review steps'}</button><button type="button" disabled={busy || !steps.length} className={confirmed ? 'outline-button' : 'primary-button'} onClick={() => onModule(module.id)}>{confirmed ? 'Remove confirmation' : 'Confirm for this case'}</button></div></div>{!confirmed && <p className="crime-preview-note">Preview only. These steps do not affect case progress until confirmed.</p>}{module.id === 'theft' && <p className="crime-preview-note">Robbery-specific additions retain their Robbery label.</p>}{expanded && stages(steps, module.id, confirmed)}</section>
      }) : <div className="workflow-empty"><strong>No crime-specific section was detected.</strong><p>Review the source material and case classification before adding extra procedures.</p></div>}
    </section>
    <section className="workflow-library"><button type="button" className="stage-heading" aria-expanded={showOther} onClick={() => setShowOther(!showOther)}><span><span className="stage-name">Other source-linked material</span><span className="stage-caption">{ordered.filter(s => areaForStep(s) === 'library' || (areaForStep(s) !== 'core' && !relevantModules.some(m => m.id === areaForStep(s)))).length} steps outside the suggested sections · retained for review</span></span><span aria-hidden="true">{showOther ? '−' : '+'}</span></button>{showOther && (() => { const other = ordered.filter(s => (areaForStep(s) === 'library' || (areaForStep(s) !== 'core' && !relevantModules.some(m => m.id === areaForStep(s)))) && matches(s)); return <div className="stage-content">{!other.length && <p className="muted">No matching source material. Try “All source material” in the Show filter.</p>}{other.slice(0, otherLimit).map((s, i) => renderStep(s, `R${i + 1}`, workflowStatus(s, progress), false, false))}{other.length > otherLimit && <button type="button" className="workflow-more" onClick={() => setOtherLimit(otherLimit + 20)}>Show more source material <span>{otherLimit} of {other.length} shown ↓</span></button>}</div> })()}</section>
  </div>
}
