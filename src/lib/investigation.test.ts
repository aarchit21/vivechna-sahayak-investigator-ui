import { describe, expect, it } from 'vitest'
import source from '../data/case.json'
import { activeSteps, areaForStep, countByTier, suggestedModules } from './investigation'
import { ApiError, createApiAdapter } from './backend'
import type { CasePayload } from '../types'

const data = source as unknown as CasePayload

describe('imported investigation', () => {
  it('keeps the complete source library and unique step IDs', () => {
    expect(data.steps).toHaveLength(637)
    expect(new Set(data.steps.map((step) => step.id)).size).toBe(637)
    expect(countByTier(data.steps)).toEqual({ MUST_DO: 244, SHOULD_DO: 170, REFERENCE: 223 })
    expect(data.fir.data_quality_warnings).toHaveLength(2)
  })

  it('keeps additional procedures outside the queue until confirmed', () => {
    const core = activeSteps(data.steps, [])
    expect(core.length).toBeGreaterThan(0)
    expect(core.every((step) => areaForStep(step) === 'core')).toBe(true)
    const withMurder = activeSteps(data.steps, ['murder'])
    expect(withMurder.length).toBeGreaterThan(core.length)
    expect(withMurder.some((step) => areaForStep(step) === 'murder')).toBe(true)
    expect(withMurder.every((step) => areaForStep(step) !== 'theft')).toBe(true)
  })

  it('suggests the three sections from the stated case routing', () => {
    expect(suggestedModules(data)).toEqual(['heinous', 'murder', 'theft'])
  })
})

describe('future API adapter', () => {
  it('sends versioned module selections with same-origin credentials', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ confirmedModules: ['murder'], version: 2 }), { status: 200 })
    }
    const api = createApiAdapter(fakeFetch as typeof fetch)
    const result = await api.saveModules('case/one', ['murder'], 1)
    expect(result.version).toBe(2)
    expect(calls[0].url).toBe('/api/cases/case%2Fone/modules')
    expect(calls[0].init?.credentials).toBe('include')
    expect(calls[0].init?.method).toBe('PUT')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ confirmedModules: ['murder'], version: 1 })
  })

  it('reports a stale write without accepting it', async () => {
    const api = createApiAdapter(async () => new Response('{}', { status: 409 }) as never)
    await expect(api.saveTask('case', 'step', { done: true, completedTickIds: [], version: 1 }))
      .rejects.toMatchObject({ status: 409 } satisfies Partial<ApiError>)
  })

  it.each([401, 403, 404, 500])('surfaces API status %i', async (status) => {
    const api = createApiAdapter(async () => new Response('{}', { status }) as never)
    await expect(api.load('case')).rejects.toMatchObject({ status } satisfies Partial<ApiError>)
  })

  it('reports an offline service without changing data', async () => {
    const api = createApiAdapter(async () => { throw new TypeError('offline') })
    await expect(api.load('case')).rejects.toMatchObject({ status: 0 } satisfies Partial<ApiError>)
  })
})
