import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ProjectState, Instability, GraphNode, GraphEdge, Hypothesis, Assay, Paper } from '../types'
import { seed } from '../data/seed'
import { computeInstabilities, stabilityScore } from './suspension'

// localStorage-backed store. No backend in v1 — the graph lives in the browser.
const KEY = 'williamslab.project.v1'

function uid(prefix: string): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rnd}`
}

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
  // instability / project
  setInstabilityStatus: (id: string, status: 'open' | 'acknowledged' | 'resolved') => void
  setPreRegistered: (v: boolean) => void
  setPrimaryEndpoint: (v: string | undefined) => void
  // graph
  addNode: (n: Omit<GraphNode, 'id'> & { id?: string }) => string
  updateNode: (id: string, patch: Partial<GraphNode>) => void
  removeNode: (id: string) => void
  addEdge: (e: Omit<GraphEdge, 'id'> & { id?: string }) => string
  removeEdge: (id: string) => void
  // hypotheses
  addHypothesis: (h: Omit<Hypothesis, 'id'> & { id?: string }) => string
  updateHypothesis: (id: string, patch: Partial<Hypothesis>) => void
  removeHypothesis: (id: string) => void
  // assays
  addAssay: (a: Omit<Assay, 'id'> & { id?: string }) => string
  updateAssay: (id: string, patch: Partial<Assay>) => void
  removeAssay: (id: string) => void
  // papers
  addPaper: (p: Omit<Paper, 'id'> & { id?: string }, linkHypothesisId?: string) => string
  removePaper: (id: string) => void
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

    addNode: (n) => {
      const id = n.id ?? uid('node')
      setState((s) => ({ ...s, nodes: [...s.nodes, { ...n, id }] }))
      return id
    },
    updateNode: (id, patch) => setState((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
    removeNode: (id) =>
      setState((s) => ({
        ...s,
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.src !== id && e.dst !== id),
      })),

    addEdge: (e) => {
      const id = e.id ?? uid('edge')
      setState((s) => ({ ...s, edges: [...s.edges, { ...e, id }] }))
      return id
    },
    removeEdge: (id) => setState((s) => ({ ...s, edges: s.edges.filter((e) => e.id !== id) })),

    addHypothesis: (h) => {
      const id = h.id ?? uid('hyp')
      setState((s) => ({
        ...s,
        hypotheses: [...s.hypotheses, { ...h, id }],
        nodes: [...s.nodes, { id, type: 'Hypothesis', label: h.label.split('·')[0].trim() || 'Hypothesis', sublabel: 'hypothesis', x: 500 + rand(160), y: 320 + rand(120) }],
      }))
      return id
    },
    updateHypothesis: (id, patch) =>
      setState((s) => ({
        ...s,
        hypotheses: s.hypotheses.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        nodes: patch.label ? s.nodes.map((n) => (n.id === id ? { ...n, label: patch.label!.split('·')[0].trim() } : n)) : s.nodes,
      })),
    removeHypothesis: (id) =>
      setState((s) => ({
        ...s,
        hypotheses: s.hypotheses.filter((h) => h.id !== id),
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.src !== id && e.dst !== id),
        papers: s.papers.map((p) => ({ ...p, targets: (p.targets ?? []).filter((t) => t !== id) })),
        assays: s.assays.map((a) => ({ ...a, claims: (a.claims ?? []).filter((c) => c !== id) })),
      })),

    addAssay: (a) => {
      const id = a.id ?? uid('assay')
      setState((s) => ({ ...s, assays: [...s.assays, { ...a, id }] }))
      return id
    },
    updateAssay: (id, patch) => setState((s) => ({ ...s, assays: s.assays.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
    removeAssay: (id) => setState((s) => ({ ...s, assays: s.assays.filter((a) => a.id !== id) })),

    addPaper: (p, linkHypothesisId) => {
      const id = p.id ?? uid('paper')
      setState((s) => {
        if (s.papers.some((x) => x.id === id)) return s // dedupe
        const targets = linkHypothesisId ? Array.from(new Set([...(p.targets ?? []), linkHypothesisId])) : p.targets
        const nextPapers = [...s.papers, { ...p, id, targets }]
        const nextNodes = s.nodes.some((n) => n.id === id)
          ? s.nodes
          : [...s.nodes, { id, type: 'Paper' as const, label: 'Paper', sublabel: p.year ? String(p.year) : 'ref', x: 860 + rand(80), y: 380 + rand(120) }]
        let nextHyp = s.hypotheses
        let nextEdges = s.edges
        if (linkHypothesisId) {
          nextHyp = s.hypotheses.map((h) =>
            h.id === linkHypothesisId ? { ...h, supportingPapers: Array.from(new Set([...(h.supportingPapers ?? []), id])) } : h,
          )
          nextEdges = [...s.edges, { id: uid('edge'), src: id, dst: linkHypothesisId, rel: 'supports' as const, evidence: 'correlational' as const, strength: 0.4 }]
        }
        return { ...s, papers: nextPapers, nodes: nextNodes, hypotheses: nextHyp, edges: nextEdges }
      })
      return id
    },
    removePaper: (id) =>
      setState((s) => ({
        ...s,
        papers: s.papers.filter((p) => p.id !== id),
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.src !== id && e.dst !== id),
        hypotheses: s.hypotheses.map((h) => ({ ...h, supportingPapers: (h.supportingPapers ?? []).filter((x) => x !== id) })),
      })),

    reset: () => setState(seed),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function rand(span: number): number {
  return Math.round((Math.random() - 0.5) * span)
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore must be used within StoreProvider')
  return c
}
