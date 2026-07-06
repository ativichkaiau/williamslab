import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ProjectState, Instability } from '../types'
import { seed } from '../data/seed'
import { computeInstabilities, stabilityScore } from './suspension'

// localStorage-backed store. No backend in v1 — the graph lives in the browser.
const KEY = 'williamslab.project.v1'

function load(): ProjectState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seed, ...JSON.parse(raw) }
  } catch {
    /* ignore corrupt state, fall back to seed */
  }
  return seed
}

interface StoreCtx {
  state: ProjectState
  instabilities: Instability[]
  stability: number
  setInstabilityStatus: (id: string, status: 'open' | 'acknowledged' | 'resolved') => void
  setPreRegistered: (v: boolean) => void
  setPrimaryEndpoint: (v: string | undefined) => void
  reset: () => void
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable; app still works in-memory */
    }
  }, [state])

  const instabilities = useMemo(() => computeInstabilities(state), [state])
  const stability = useMemo(() => stabilityScore(instabilities), [instabilities])

  const value: StoreCtx = {
    state,
    instabilities,
    stability,
    setInstabilityStatus: (id, status) =>
      setState((s) => {
        const overrides = { ...s.instabilityOverrides }
        if (status === 'open') delete overrides[id]
        else overrides[id] = status
        return { ...s, instabilityOverrides: overrides }
      }),
    setPreRegistered: (v) => setState((s) => ({ ...s, project: { ...s.project, preRegistered: v } })),
    setPrimaryEndpoint: (v) => setState((s) => ({ ...s, project: { ...s.project, primaryEndpoint: v } })),
    reset: () => setState(seed),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore must be used within StoreProvider')
  return c
}
