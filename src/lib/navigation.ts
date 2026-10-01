import { useEffect, useState } from 'react'

export type CaseView = 'overview' | 'queue' | 'special' | 'library' | 'fir'
export type SystemView = 'dashboard' | 'cases' | 'work-queue' | 'search' | 'reports'
export type Route = { scope: 'system'; view: SystemView } | { scope: 'case'; view: CaseView }

export const CASE_ID = '11192011260307-2026'
export const SYSTEM_NAV: { id: SystemView; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'cases', label: 'Cases', icon: '▣' },
  { id: 'work-queue', label: 'Work Queue', icon: '☷' },
  { id: 'search', label: 'Search', icon: '⌕' },
  { id: 'reports', label: 'Reports', icon: '▥' },
]
export const CASE_NAV: { id: CaseView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'fir', label: 'FIR' },
  { id: 'queue', label: 'Investigation' },
  { id: 'special', label: 'Special procedures' },
  { id: 'library', label: 'All steps' },
]

function routePath(route: Route) {
  return route.scope === 'case' ? `#/cases/${CASE_ID}/${route.view}` : `#/${route.view}`
}

function readRoute(): Route {
  const path = window.location.hash.slice(2).split('/')
  if (path[0] === 'cases' && path[1] === CASE_ID && CASE_NAV.some((item) => item.id === path[2])) {
    return { scope: 'case', view: path[2] as CaseView }
  }
  return { scope: 'system', view: SYSTEM_NAV.some((item) => item.id === path[0]) ? path[0] as SystemView : 'dashboard' }
}

function routeLabel(route: Route) {
  return route.scope === 'case'
    ? `case ${CASE_NAV.find((item) => item.id === route.view)?.label.toLowerCase()}`
    : SYSTEM_NAV.find((item) => item.id === route.view)!.label.toLowerCase()
}

interface NavigationState { depth: number; previousLabel?: string; scrollY: number }
const stateKey = 'vivechnaNavigation'

export function useNavigation() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [state, setState] = useState<NavigationState>(() => window.history.state?.[stateKey] || { depth: 0, scrollY: 0 })

  useEffect(() => {
    if (!window.history.state?.[stateKey]) {
      window.history.replaceState({ ...window.history.state, [stateKey]: { depth: 0, scrollY: 0 } }, '', routePath(readRoute()))
    }
    const restore = () => {
      const nextState = window.history.state?.[stateKey] || { depth: 0, scrollY: 0 }
      setRoute(readRoute()); setState(nextState)
      requestAnimationFrame(() => window.scrollTo({ top: nextState.scrollY, behavior: 'instant' }))
    }
    window.addEventListener('popstate', restore)
    window.addEventListener('hashchange', restore)
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore) }
  }, [])

  const go = (next: Route) => {
    if (routePath(next) === routePath(route)) return
    window.history.replaceState({ ...window.history.state, [stateKey]: { ...state, scrollY: window.scrollY } }, '')
    const nextState = { depth: state.depth + 1, previousLabel: routeLabel(route), scrollY: 0 }
    window.history.pushState({ [stateKey]: nextState }, '', routePath(next))
    setRoute(next); setState(nextState)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const back = () => {
    if (state.depth > 0) window.history.back()
    else go(route.scope === 'case' && route.view !== 'overview' ? { scope: 'case', view: 'overview' } : { scope: 'system', view: 'cases' })
  }

  return { route, go, back, backLabel: state.previousLabel || (route.scope === 'case' && route.view !== 'overview' ? 'case overview' : 'cases'), canGoBack: state.depth > 0 }
}
