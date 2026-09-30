import { useEffect, useMemo, useState } from 'react'
import { adapter, isDemoMode } from './lib/backend'
import { activeSteps, areaForStep, countByTier, displayTitle, isRobberyStep, MODULES, PHASES, searchableText, suggestedModules, TIERS } from './lib/investigation'
import type { InvestigationRecord, InvestigationStep, ModuleId, Phase, StepArea, TaskProgress, Tier } from './types'

type View = 'overview' | 'queue' | 'special' | 'library' | 'fir'
type DetailTab = 'action' | 'legal' | 'sources'

const CASE_ID = '11192011260307-2026'
const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '▦' },
  { id: 'queue', label: 'Work queue', icon: '☷' },
  { id: 'special', label: 'Special procedures', icon: '◇' },
  { id: 'library', label: 'All steps', icon: '▤' },
  { id: 'fir', label: 'FIR record', icon: '▣' },
]

function Field({ label, value }: { label: string; value?: string | null }) {
  return <div className="field"><span className="field-label">{label}</span><span className="field-value">{value || 'Not recorded'}</span></div>
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round(done / total * 100) : 0
  return <div className="progress-wrap" aria-label={`${done} of ${total} completed`}>
    <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
    <span>{percent}%</span>
  </div>
}

function StepCard({ step, progress, onProgress, editable = true, compact = false }: {
  step: InvestigationStep
  progress?: TaskProgress
  onProgress: (step: InvestigationStep, next: TaskProgress) => void
  editable?: boolean
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<DetailTab>('action')
  const done = !!progress?.done
  const tickIds = progress?.completedTickIds || []
  const update = (next: Partial<TaskProgress>) => onProgress(step, {
    done, completedTickIds: tickIds, version: progress?.version || 0, ...next,
  })
  const toggleTick = (id: string) => update({ completedTickIds: tickIds.includes(id) ? tickIds.filter((tick) => tick !== id) : [...tickIds, id] })
  const area = areaForStep(step)

  return <article className={`step-card ${done ? 'is-done' : ''} ${compact ? 'compact' : ''}`}>
    <div className="step-top">
      <input className="task-check" type="checkbox" aria-label={`Mark ${displayTitle(step)} complete`} checked={done} disabled={!editable} onChange={() => update({ done: !done })} />
      <div className="step-heading">
        <div className="step-overline"><span className={`tier ${step.triage.toLowerCase()}`}>{TIERS.find((tier) => tier.id === step.triage)?.label}</span><span>{step.group}</span>{area === 'theft' && isRobberyStep(step) && <span className="robbery-tag">Robbery</span>}</div>
        <h3>{displayTitle(step)}</h3>
        <div className="step-meta">
          {step.responsible && <span>Owner: {step.responsible}</span>}
          {step.deadline && <span>Due: {step.deadline}</span>}
          {!editable && <span>Available for review</span>}
        </div>
      </div>
      <button className="text-button detail-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Close' : 'Details'} <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span></button>
    </div>
    {expanded && <div className="step-detail">
      <div className="detail-tabs" role="tablist" aria-label={`Details for ${displayTitle(step)}`}>
        {(['action', 'legal', 'sources'] as DetailTab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item === 'action' ? 'What to do' : item === 'legal' ? 'Legal basis' : `Sources (${step.sources?.length || 0})`}</button>)}
      </div>
      {tab === 'action' && <div className="detail-body">
        <p className="step-summary">{step.text}</p>
        {step.applies_when && <p className="condition"><strong>Applies when:</strong> {step.applies_when}</p>}
        {(step.ticks?.length || 0) > 0 && <div className="subtasks"><h4>Action checklist</h4>{step.ticks!.map((tick, index) => <div className="tick-group" key={`${step.id}-${index}`}>
          <label className="tick-row"><input type="checkbox" checked={tickIds.includes(String(index))} disabled={!editable} onChange={() => toggleTick(String(index))} /><span>{tick.do}</span></label>
          {tick.sub?.map((sub, subIndex) => <label className="tick-row nested" key={`${step.id}-${index}-${subIndex}`}><input type="checkbox" checked={tickIds.includes(`${index}.${subIndex}`)} disabled={!editable} onChange={() => toggleTick(`${index}.${subIndex}`)} /><span>{sub}</span></label>)}
        </div>)}</div>}
        {step.note && <p className="detail-note">{step.note}</p>}
      </div>}
      {tab === 'legal' && <div className="detail-body legal-body">
        <Field label="Legal basis" value={step.legal_basis?.join(' · ')} />
        <Field label="Authority" value={step.authority} />
        <Field label="Responsible" value={step.responsible} />
        <Field label="Deadline in source" value={step.deadline} />
        {step.triage_why && <p className="detail-note"><strong>Why this priority:</strong> {step.triage_why}</p>}
        {(step.details?.length || 0) > 0 && <div className="source-list"><h4>Supporting detail</h4>{step.details!.map((detail, index) => <div className="source-item" key={`${step.id}-detail-${index}`}><p>{detail.text}</p><small>{detail.citation}{detail.section ? ` · ${detail.section}` : ''}{detail.page != null ? ` · p. ${detail.page}` : ''}</small></div>)}</div>}
      </div>}
      {tab === 'sources' && <div className="detail-body"><p className="muted">Citation metadata is preserved from the source case. Document files will open when supplied by the backend.</p><div className="source-list">{(step.sources || []).map((source, index) => <div className="source-item" key={`${step.id}-source-${index}`}><div className="source-line"><strong>{source.citation}</strong><span className="source-role">{source.role || 'source'}</span></div><p>{[source.section, source.page != null ? `p. ${source.page}` : null].filter(Boolean).join(' · ') || 'Location not specified'}</p>{source.authority && <small>{source.authority}</small>}</div>)}</div>{!step.sources?.length && <p>No citation was included for this step in the imported record.</p>}</div>}
    </div>}
  </article>
}

function StepResults({ steps, progress, onProgress, editable, group = false, limit = 40 }: {
  steps: InvestigationStep[]
  progress: Record<string, TaskProgress>
  onProgress: (step: InvestigationStep, next: TaskProgress) => void
  editable: (step: InvestigationStep) => boolean
  group?: boolean
  limit?: number
}) {
  const [visible, setVisible] = useState(limit)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  if (!steps.length) return <div className="empty-state"><strong>No steps match these filters.</strong><p>Try another phase, priority, or search term.</p></div>
  if (!group) return <div className="step-list">{steps.slice(0, visible).map((step) => <StepCard key={step.id} step={step} progress={progress[step.id]} onProgress={onProgress} editable={editable(step)} />)}{visible < steps.length && <button className="load-more" type="button" onClick={() => setVisible(visible + limit)}>Show more steps <span>{visible} of {steps.length}</span></button>}</div>

  const groups = [...new Set(steps.map((step) => step.group))]
  return <div className="group-list">{groups.map((name) => {
    const groupSteps = steps.filter((step) => step.group === name)
    const isOpen = openGroups.has(name)
    return <section className="task-group" key={name}><button className="group-head" type="button" aria-expanded={isOpen} onClick={() => setOpenGroups((old) => { const next = new Set(old); if (next.has(name)) next.delete(name); else next.add(name); return next })}><span><span className="chevron">{isOpen ? '⌄' : '›'}</span>{name}</span><span className="group-count">{groupSteps.length}</span></button>{isOpen && <div className="group-content">{groupSteps.map((step) => <StepCard key={step.id} step={step} progress={progress[step.id]} onProgress={onProgress} editable={editable(step)} />)}</div>}</section>
  })}</div>
}

function WarningList({ warnings, reviewed, onToggle }: { warnings: string[]; reviewed: Set<number>; onToggle: (index: number) => void }) {
  return <div className="warning-list">{warnings.map((warning, index) => <div className={`warning-item ${reviewed.has(index) ? 'reviewed' : ''}`} key={index}><div className="warning-icon">!</div><div><strong>{index === 0 ? 'Missing value in structured record' : index === 1 ? 'Conflicting vehicle registration' : 'Record needs verification'}</strong><p>{warning}</p></div><button type="button" className="small-button" onClick={() => onToggle(index)}>{reviewed.has(index) ? 'Reopen' : 'Mark checked'}</button></div>)}</div>
}

export default function App() {
  const [record, setRecord] = useState<InvestigationRecord | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [view, setView] = useState<View>('overview')
  const [phase, setPhase] = useState<Phase>('now')
  const [tier, setTier] = useState<Tier>('MUST_DO')
  const [query, setQuery] = useState('')
  const [hideDone, setHideDone] = useState(false)
  const [libraryArea, setLibraryArea] = useState<StepArea | 'all'>('all')
  const [selectedModule, setSelectedModule] = useState<ModuleId>('heinous')
  const [reviewedWarnings, setReviewedWarnings] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => { adapter.load(CASE_ID).then(setRecord).catch((error: Error) => setLoadError(error.message)) }, [])
  const data = record?.case
  const modules = record?.confirmedModules || []
  const progress = record?.progress || {}
  const caseSteps = useMemo(() => data ? activeSteps(data.steps, modules) : [], [data, modules])
  const suggestions = useMemo(() => data ? suggestedModules(data) : [], [data])
  const mustDo = caseSteps.filter((step) => step.triage === 'MUST_DO')
  const doneMustDo = mustDo.filter((step) => progress[step.id]?.done).length
  const warnings = data ? [...data.fir.data_quality_warnings, ...(data.routing_warnings || []).filter((warning) => !data.fir.data_quality_warnings.includes(warning))] : []
  const queueSteps = useMemo(() => caseSteps.filter((step) => step.phase === phase && step.triage === tier && (!hideDone || !progress[step.id]?.done) && (!query || searchableText(step).includes(query.toLocaleLowerCase().trim()))), [caseSteps, phase, tier, hideDone, progress, query])
  const librarySteps = useMemo(() => (data?.steps || []).filter((step) => (libraryArea === 'all' || areaForStep(step) === libraryArea) && (!query || searchableText(step).includes(query.toLocaleLowerCase().trim())) && (!hideDone || !progress[step.id]?.done)), [data, libraryArea, query, hideDone, progress])
  const specialSteps = useMemo(() => (data?.steps || []).filter((step) => areaForStep(step) === selectedModule), [data, selectedModule])

  const saveProgress = async (step: InvestigationStep, next: TaskProgress) => {
    if (!record) return
    setBusy(true); setSaveError('')
    try {
      const saved = await adapter.saveTask(CASE_ID, step.id, next)
      setRecord((current) => current ? { ...current, progress: { ...current.progress, [step.id]: saved } } : current)
    } catch (error) { setSaveError((error as Error).message) } finally { setBusy(false) }
  }

  const toggleModule = async (id: ModuleId) => {
    if (!record) return
    const next = modules.includes(id) ? modules.filter((module) => module !== id) : [...modules, id]
    setBusy(true); setSaveError('')
    try {
      const saved = await adapter.saveModules(CASE_ID, next, record.modulesVersion)
      setRecord((current) => current ? { ...current, confirmedModules: saved.confirmedModules, modulesVersion: saved.version } : current)
    } catch (error) { setSaveError((error as Error).message) } finally { setBusy(false) }
  }

  const navigate = (next: View) => { setView(next); setQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (loadError) return <div className="boot-state"><div className="boot-card"><h1>Case unavailable</h1><p>{loadError}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div></div>
  if (!data) return <div className="boot-state"><div className="boot-card"><div className="loading-dot" /><p>Opening investigation workspace…</p></div></div>

  const firField = (name: string) => data.fir.fields.find((field) => field.k === name)?.v
  const currentPhase = PHASES.find((item) => item.id === phase)!

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">V</div><div><strong>Vivechna Sahayak</strong><small>Investigation workspace</small></div></div><div className="sidebar-case"><small>OPEN CASE</small><strong>FIR {data.fir.fir_number}</strong><span>{data.fir.police_station}</span></div><nav aria-label="Main navigation">{NAV.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} type="button" onClick={() => navigate(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}{item.id === 'special' && <span className="nav-badge">{modules.length}</span>}</button>)}</nav><div className="sidebar-bottom"><span className="status-dot" />{isDemoMode ? 'Demo session · changes reset on refresh' : 'Connected to case service'}</div></aside>

    <div className="main-shell"><header className="mobile-header"><div className="brand-mark">V</div><strong>Vivechna Sahayak</strong><span>{isDemoMode ? 'DEMO' : 'LIVE'}</span></header><main className="page">
      <div className="page-heading"><div><p className="eyebrow">BOPAL POLICE STATION <span> / </span> CASE {data.fir.fir_number}</p><h1>{view === 'overview' ? 'Investigation overview' : view === 'queue' ? 'Work queue' : view === 'special' ? 'Special procedures' : view === 'library' ? 'All investigation steps' : 'FIR record'}</h1><p className="heading-subtitle">{view === 'overview' ? 'The case context and next actions in one place.' : view === 'queue' ? 'Work through the steps by time and priority.' : view === 'special' ? 'Review additional procedures before adding them to this case.' : view === 'library' ? 'Search every imported step and its source material.' : 'Read the full structured record and original FIR text.'}</p></div><div className="top-status"><span className="status-dot" />{isDemoMode ? 'Demo mode' : 'Connected'}</div></div>
      {isDemoMode && <div className="demo-banner"><strong>Demo workspace.</strong> This case is shown exactly as imported from the linked page. Task changes and procedure selections remain in this browser session and reset on refresh. <span>Use the cited sources and paper FIR for verification.</span></div>}
      {saveError && <div className="error-banner" role="alert"><strong>Change was not saved.</strong> {saveError}<button type="button" onClick={() => setSaveError('')}>Dismiss</button></div>}

      <section className="case-header"><div className="case-main"><span className="section-label">CASE FILE</span><div className="case-title-line"><h2>FIR {data.fir.fir_number}</h2><div className="section-chips">{data.fir.sections_stated.map((section) => <span key={section}>{section}</span>)}</div></div><p>{data.fir.police_station} · {firField('District')} · Registered {firField('Date & time FIR registered')}</p></div><div className="case-actions"><button type="button" className="outline-button" onClick={() => navigate('fir')}>View full FIR <span aria-hidden="true">↗</span></button></div></section>

      {view === 'overview' && <>
        <div className="overview-grid"><section className="panel progress-panel"><div className="panel-head"><div><span className="section-label">CASE PROGRESS</span><h2>Investigation at a glance</h2></div><span className="metric-large">{doneMustDo}<small> / {mustDo.length}</small></span></div><p className="muted">Required steps completed across the shared procedure and confirmed special sections.</p><ProgressBar done={doneMustDo} total={mustDo.length} /><div className="progress-foot"><span>{modules.length} special sections added</span><button type="button" className="text-button" onClick={() => navigate('queue')}>Open work queue →</button></div></section><section className="panel alert-panel"><div className="panel-head"><div><span className="section-label amber">VERIFY FIRST</span><h2>{warnings.length - reviewedWarnings.size} record {warnings.length - reviewedWarnings.size === 1 ? 'issue' : 'issues'} to review</h2></div><div className="alert-symbol">!</div></div><p className="muted">These differences come from the imported FIR and should be checked against the paper record.</p><button type="button" className="text-button" onClick={() => navigate('fir')}>Review inconsistencies →</button></section></div>
        <section className="section-block"><div className="section-heading"><div><span className="section-label">WORK BY TIME</span><h2>Where to focus</h2></div><p>Choose a phase to open its queue.</p></div><div className="phase-grid">{PHASES.map((item) => { const phaseMust = caseSteps.filter((step) => step.phase === item.id && step.triage === 'MUST_DO'); const phaseDone = phaseMust.filter((step) => progress[step.id]?.done).length; return <button type="button" className="phase-card" key={item.id} onClick={() => { setPhase(item.id); setTier('MUST_DO'); navigate('queue') }}><span className="phase-card-top"><span>{item.label}</span><span aria-hidden="true">↗</span></span><strong>{phaseMust.length - phaseDone}<small> open</small></strong><span>{item.description}</span><span className="phase-mini-bar"><i style={{ width: `${phaseMust.length ? phaseDone / phaseMust.length * 100 : 0}%` }} /></span></button> })}</div></section>
        <section className="section-block"><div className="section-heading"><div><span className="section-label">NEXT ACTIONS</span><h2>Required right now</h2></div><button type="button" className="text-button" onClick={() => { setPhase('now'); setTier('MUST_DO'); navigate('queue') }}>See all right-now steps →</button></div><div className="step-list overview-steps">{caseSteps.filter((step) => step.phase === 'now' && step.triage === 'MUST_DO' && !progress[step.id]?.done).slice(0, 3).map((step) => <StepCard compact key={step.id} step={step} progress={progress[step.id]} onProgress={saveProgress} />)}</div></section>
        <section className="section-block"><div className="section-heading"><div><span className="section-label">ADDITIONAL PROCEDURE</span><h2>Review for this case</h2></div><button type="button" className="text-button" onClick={() => navigate('special')}>Open special sections →</button></div><div className="module-grid">{MODULES.map((module) => <button type="button" className="module-tile" key={module.id} onClick={() => { setSelectedModule(module.id); navigate('special') }}><span className="module-icon">{module.id === 'heinous' ? 'H' : module.id === 'murder' ? 'M' : 'T'}</span><strong>{module.label}</strong><span>{modules.includes(module.id) ? 'Added to queue' : suggestions.includes(module.id) ? 'Suggested · review needed' : 'Available to review'}</span><span className="module-arrow">→</span></button>)}</div></section>
      </>}

      {view === 'queue' && <><section className="section-block first-block"><div className="section-heading"><div><span className="section-label">ACTIVE CASE</span><h2>Investigation queue</h2></div><span className="result-count">{caseSteps.length} active steps</span></div><div className="phase-tabs" role="tablist" aria-label="Investigation phase">{PHASES.map((item) => { const count = caseSteps.filter((step) => step.phase === item.id && step.triage === tier).length; return <button key={item.id} role="tab" type="button" aria-selected={phase === item.id} className={phase === item.id ? 'selected' : ''} onClick={() => setPhase(item.id)}><span>{item.label}</span><strong>{count}</strong></button> })}</div><div className="filter-bar"><div className="search-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search active steps" placeholder="Search steps, source or owner…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="tier-switch" role="group" aria-label="Priority">{TIERS.map((item) => <button key={item.id} type="button" className={tier === item.id ? 'selected' : ''} aria-pressed={tier === item.id} onClick={() => setTier(item.id)}>{item.label}</button>)}</div><label className="hide-toggle"><input type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} /> Hide done</label></div><div className="queue-summary"><div><strong>{currentPhase.label}</strong><span>{currentPhase.description}</span></div><span>{queueSteps.length} {tier.toLowerCase().replace('_', ' ')} steps shown</span></div><StepResults steps={queueSteps} progress={progress} onProgress={saveProgress} editable={() => !busy} group /></section></>}

      {view === 'special' && <><section className="section-block first-block"><div className="section-heading"><div><span className="section-label">CRIME-SPECIFIC WORK</span><h2>Additional steps, kept separate</h2></div></div><p className="section-intro">The shared queue covers general investigation work. Review each extra section below and add it to this case only when it applies. The source case suggests sections from its stated offences; confirmation remains with the investigator.</p><div className="special-tabs" role="tablist" aria-label="Special procedure">{MODULES.map((module) => <button key={module.id} type="button" role="tab" aria-selected={selectedModule === module.id} className={selectedModule === module.id ? 'selected' : ''} onClick={() => setSelectedModule(module.id)}><span>{module.label}</span>{modules.includes(module.id) && <span className="selected-dot" />}</button>)}</div><div className="module-detail"><div className="module-detail-top"><div><span className="section-label">{modules.includes(selectedModule) ? 'CONFIRMED FOR CASE' : suggestions.includes(selectedModule) ? 'SUGGESTED FROM FIR · NEEDS CONFIRMATION' : 'AVAILABLE TO REVIEW'}</span><h2>{MODULES.find((module) => module.id === selectedModule)?.label}</h2><p>{MODULES.find((module) => module.id === selectedModule)?.description}</p></div><button type="button" className={modules.includes(selectedModule) ? 'outline-button' : 'primary-button'} disabled={busy} onClick={() => toggleModule(selectedModule)}>{modules.includes(selectedModule) ? 'Remove from queue' : 'Add to this case'}</button></div>{selectedModule === 'heinous' && <div className="linked-note"><strong>Linked shared step:</strong> The imported “Draw and Annotate the Crime Scene Sketch” step includes a to-scale instruction for heinous crimes. It remains in the shared queue so its ordinary scene-sketch work is not duplicated.</div>}{selectedModule === 'theft' && <div className="linked-note"><strong>Robbery in this FIR:</strong> Robbery-specific steps are marked “Robbery” within this section. Confirm each step’s applicability to the case before acting.</div>}<div className="module-count"><strong>{specialSteps.length} source-linked additional steps</strong><span>{modules.includes(selectedModule) ? 'Included in the active queue' : 'Preview only until confirmed'}</span></div><StepResults steps={specialSteps} progress={progress} onProgress={saveProgress} editable={() => modules.includes(selectedModule) && !busy} limit={25} /></div></section></>}

      {view === 'library' && <section className="section-block first-block"><div className="section-heading"><div><span className="section-label">COMPLETE SOURCE LIBRARY</span><h2>All {data.steps.length} imported steps</h2></div><span className="result-count">{countByTier(data.steps).MUST_DO} must do · {countByTier(data.steps).SHOULD_DO} should do · {countByTier(data.steps).REFERENCE} reference</span></div><p className="section-intro">Every imported step remains here, including material for other crime types. Only shared steps and confirmed special sections enter the active queue.</p><div className="filter-bar library-filters"><div className="search-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search all steps" placeholder="Search title, section, source or text…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select aria-label="Filter by section" value={libraryArea} onChange={(event) => setLibraryArea(event.target.value as StepArea | 'all')}><option value="all">Every section</option><option value="core">Shared procedure</option>{MODULES.map((module) => <option key={module.id} value={module.id}>{module.label}</option>)}<option value="library">Other source material</option></select><label className="hide-toggle"><input type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} /> Hide done</label></div><div className="queue-summary"><strong>{librarySteps.length} matching steps</strong><span>Showing {Math.min(librarySteps.length, 40)} initially</span></div><StepResults steps={librarySteps} progress={progress} onProgress={saveProgress} editable={(step) => areaForStep(step) === 'core' || modules.includes(areaForStep(step) as ModuleId)} /></section>}

      {view === 'fir' && <><section className="section-block first-block"><div className="section-heading"><div><span className="section-label">RECORD QUALITY</span><h2>Check before relying on this record</h2></div><span className="result-count">{warnings.length - reviewedWarnings.size} open</span></div><WarningList warnings={warnings} reviewed={reviewedWarnings} onToggle={(index) => setReviewedWarnings((old) => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next })} /><p className="section-hint">“Mark checked” is a local review marker. It does not alter or correct the FIR.</p></section><section className="section-block"><div className="section-heading"><div><span className="section-label">STRUCTURED FIR</span><h2>Case details</h2></div></div><div className="fir-grid">{data.fir.fields.map((field, index) => <div className="fir-field" key={`${field.k}-${index}`}><span>{field.k}</span><strong>{field.v}</strong></div>)}</div></section><section className="section-block"><div className="section-heading"><div><span className="section-label">CASE NARRATIVE</span><h2>What the FIR states</h2></div></div><div className="panel narrative-panel"><p>{data.fir.narrative_summary}</p><details><summary>Read original FIR text</summary><pre>{data.fir_text}</pre></details></div></section></>}
    </main><footer className="page-footer"><span>Vivechna Sahayak · {isDemoMode ? 'Local prototype' : 'Connected workspace'}</span><span>Source citations and case facts should be verified before operational use.</span></footer></div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{NAV.map((item) => <button type="button" key={item.id} className={view === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span><small>{item.id === 'special' ? 'Special' : item.id === 'library' ? 'All steps' : item.id === 'fir' ? 'FIR' : item.label}</small></button>)}</nav>
  </div>
}
