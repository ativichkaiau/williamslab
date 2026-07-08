import type { Assay } from '../types'

// Schedule assays into a phase timeline: phases run sequentially, assays within
// a phase run in parallel. Feeds the budget + Gantt rollup on the Assays page.

export const DEFAULT_WEEKS = 6

export interface PlannedAssay {
  id: string
  method: string
  weeks: number
  costK?: number
  status: Assay['status']
}
export interface PhasePlan {
  phase: number // 99 = unphased
  label: string
  startWeek: number
  endWeek: number
  assays: PlannedAssay[]
}

export function planPhases(assays: Assay[]): { phases: PhasePlan[]; totalWeeks: number; totalCost: number } {
  const groups = new Map<number, Assay[]>()
  for (const a of assays) {
    const p = a.phase ?? 99
    if (!groups.has(p)) groups.set(p, [])
    groups.get(p)!.push(a)
  }
  const order = [...groups.keys()].sort((a, b) => a - b)
  let cursor = 0
  let totalCost = 0
  const phases: PhasePlan[] = []
  for (const p of order) {
    const as = groups.get(p)!
    const dur = Math.max(...as.map((a) => a.weeks ?? DEFAULT_WEEKS))
    as.forEach((a) => (totalCost += a.costK ?? 0))
    phases.push({
      phase: p,
      label: p === 99 ? 'Unphased' : `Phase ${p}`,
      startWeek: cursor,
      endWeek: cursor + dur,
      assays: as.map((a) => ({ id: a.id, method: a.method, weeks: a.weeks ?? DEFAULT_WEEKS, costK: a.costK, status: a.status })),
    })
    cursor += dur
  }
  return { phases, totalWeeks: cursor, totalCost }
}
