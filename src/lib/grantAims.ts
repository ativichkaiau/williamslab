// Grant "Specific Aims" generator — turns the project's hypotheses, the assays
// that test them (with power + budget), and the review's clinical premise into
// the classic NIH one-page Specific Aims scaffold. Deterministic on its own;
// the page layers an optional AI polish on top.
import type { ProjectState, Assay, Hypothesis } from '../types'
import { twoSampleTPower } from './power'
import { planPhases } from './assayPlan'

export interface AimApproach {
  method: string
  cellType?: string
  power: number
  adequate: boolean
  n?: number
  costK?: number
  weeks?: number
}
export interface Aim {
  n: number
  hypId: string
  title: string
  statement: string
  prediction?: string
  falsification?: string
  status: Hypothesis['status']
  approaches: AimApproach[]
}
export interface AimsPlan {
  centralHypothesis: string
  aims: Aim[]
  orphanHyps: string[] // hypotheses with no assay testing them
  totalCost: number
  totalWeeks: number
}

// Per-assay power, matching the Power page: targeted d = 1.0, genome-wide
// d = 0.8 with a Bonferroni-corrected alpha.
export function assayPower(a: Assay): number {
  const d = a.expectedEffect ?? (a.genomeWide ? 0.8 : 1.0)
  const tests = a.genomeWide ? Math.max(1, a.genomeWideTests ?? 20000) : 1
  const alpha = 0.05 / tests
  const nPerGroup = a.sampleN ?? 0
  if (nPerGroup < 2) return 0
  return twoSampleTPower({ nPerGroup, d, alpha })
}

const shortTitle = (label: string): string => label.replace(/^H\d+\s*[·:.\-]\s*/i, '').trim() || label

function directionPhrase(h: Hypothesis): string | undefined {
  if (!h.prediction) return undefined
  const dir = h.prediction.direction === 'positive' ? 'an increase' : h.prediction.direction === 'negative' ? 'a decrease' : 'a change'
  return h.prediction.effect ? h.prediction.effect : `${dir} in the measured endpoint`
}

export function buildAimsPlan(state: ProjectState): AimsPlan {
  const byHyp = (hypId: string): Assay[] => state.assays.filter((a) => (a.claims ?? []).includes(hypId))
  const aims: Aim[] = []
  const orphanHyps: string[] = []
  let n = 0
  for (const h of state.hypotheses) {
    const assays = byHyp(h.id)
    if (assays.length === 0) {
      orphanHyps.push(shortTitle(h.label))
      continue
    }
    n += 1
    aims.push({
      n,
      hypId: h.id,
      title: shortTitle(h.label),
      statement: h.statement,
      prediction: directionPhrase(h),
      falsification: h.falsification,
      status: h.status,
      approaches: assays.map((a) => {
        const p = assayPower(a)
        return { method: a.method, cellType: a.cellType, power: p, adequate: p >= 0.8, n: a.sampleN, costK: a.costK, weeks: a.weeks }
      }),
    })
  }
  const plan = planPhases(state.assays)
  return { centralHypothesis: state.project.centralHypothesis, aims, orphanHyps, totalCost: plan.totalCost, totalWeeks: plan.totalWeeks }
}

const pct = (p: number) => `${Math.round(p * 100)}%`
const money = (k: number) => (k >= 1000 ? `$${(k / 1000).toFixed(1)}M` : `$${Math.round(k)}k`)

// The deterministic NIH-style Specific Aims one-pager (markdown).
export function aimsScaffoldMd(plan: AimsPlan, opts: { title: string; premise?: string; months?: number }): string {
  const months = Math.round(plan.totalWeeks / 4.345)
  const out: string[] = []
  out.push(`# Specific Aims`)
  out.push('')
  out.push(
    `${opts.premise ? opts.premise + ' ' : ''}Despite this, the molecular mechanisms remain incompletely defined, and no framework integrates them into testable, therapeutically relevant predictions. **The long-term goal** of this work is to close that gap.`,
  )
  out.push('')
  if (plan.centralHypothesis) {
    out.push(`**Central hypothesis.** ${plan.centralHypothesis}`)
    out.push('')
  }
  out.push(`Guided by strong preliminary data, we will test this central hypothesis through ${plan.aims.length} specific aim${plan.aims.length === 1 ? '' : 's'}:`)
  out.push('')
  for (const a of plan.aims) {
    const powered = a.approaches.filter((x) => x.adequate).length
    const bestPower = a.approaches.length ? Math.max(...a.approaches.map((x) => x.power)) : 0
    const methods = a.approaches.map((x) => `${x.method}${x.cellType ? ` in ${x.cellType}` : ''}`).join('; ')
    const powerNote = a.approaches.length
      ? ` The design is powered at **${pct(bestPower)}** (${powered}/${a.approaches.length} assay${a.approaches.length === 1 ? '' : 's'} ≥ 80%${a.approaches[0].n ? `, n = ${a.approaches[0].n}/group` : ''}).`
      : ''
    out.push(`**Specific Aim ${a.n}: ${a.title}.**`)
    out.push(
      `${a.statement}${a.prediction ? ` We predict ${a.prediction}.` : ''} *Approach:* ${methods || 'to be specified'}.${powerNote}${a.falsification ? ` *Falsifiable:* ${a.falsification}` : ''}`,
    )
    out.push('')
  }
  out.push(
    `**Impact.** Together these aims will establish a mechanistic, falsifiable account of the problem above, yielding candidate biomarkers and intervention points. Because each aim is independently powered and falsifiable, the project de-risks its central hypothesis regardless of outcome.`,
  )
  out.push('')
  out.push(
    `*Feasibility.* ${plan.aims.length} aim${plan.aims.length === 1 ? '' : 's'} across ${money(plan.totalCost)} and ${plan.totalWeeks} weeks (~${months} month${months === 1 ? '' : 's'}).${plan.orphanHyps.length ? ` Note: ${plan.orphanHyps.length} hypothesis/-es have no assay yet (${plan.orphanHyps.join('; ')}).` : ''}`,
  )
  return out.join('\n')
}

// Compact, structured context for the AI prompt.
export function aimsContext(plan: AimsPlan): string {
  const lines = [`Central hypothesis: ${plan.centralHypothesis || '(not set)'}`, `Budget: ${money(plan.totalCost)} over ${plan.totalWeeks} weeks`, '']
  for (const a of plan.aims) {
    lines.push(`Aim ${a.n}: ${a.title}`)
    lines.push(`  Hypothesis: ${a.statement}`)
    if (a.prediction) lines.push(`  Prediction: ${a.prediction}`)
    if (a.falsification) lines.push(`  Falsification: ${a.falsification}`)
    lines.push(`  Approach: ${a.approaches.map((x) => `${x.method} in ${x.cellType} (power ${pct(x.power)}${x.n ? `, n=${x.n}` : ''})`).join('; ') || '(none)'}`)
  }
  if (plan.orphanHyps.length) lines.push(`\nHypotheses without assays: ${plan.orphanHyps.join('; ')}`)
  return lines.join('\n')
}
