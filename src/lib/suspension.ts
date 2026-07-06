import type { ProjectState, Instability, Severity } from '../types'
import { assayPowerReport, fmtAlpha } from './power'

// ============================================================
// Research Active Suspension — the sensor array.
// Pure functions over ProjectState → instability flags.
// Each rule watches one way a research chassis loses grip.
// ============================================================

const HIGH_EFFORT_PER_PHASE = 2 // more than this in one phase = infeasible

export function computeInstabilities(s: ProjectState): Instability[] {
  const out: Instability[] = []
  const edgeById = new Map(s.edges.map((e) => [e.id, e]))

  // 1 · unclear hypothesis — no falsification or no predicted direction
  for (const h of s.hypotheses) {
    if (!h.falsification || !h.prediction || h.prediction.direction === 'none') {
      out.push({
        id: `inst_unclear_${h.id}`,
        type: 'unclear_hypothesis',
        severity: 'high',
        target: h.id,
        targetLabel: h.label,
        signal: !h.falsification
          ? 'No falsification criterion — nothing could disprove it.'
          : 'No predicted direction or effect size.',
        repair: 'Rewrite as if/then with a direction, an effect size, and the observation that would kill it.',
        status: 'open',
      })
    }
  }

  // 2 · weak mechanistic chain — asserted causal edge with soft evidence and no assay to bridge it
  for (const h of s.hypotheses) {
    for (const eid of h.asserts ?? []) {
      const e = edgeById.get(eid)
      if (!e) continue
      const soft = e.evidence === 'none' || e.evidence === 'predicted'
      const unbridged = !e.testedBy || e.testedBy.length === 0
      if (soft && unbridged) {
        out.push({
          id: `inst_weak_${e.id}`,
          type: 'weak_mechanistic_chain',
          severity: 'high',
          target: e.id,
          targetLabel: `${e.src} —${e.rel}→ ${e.dst}`,
          signal: `A "${e.evidence}" causal edge with no assay behind it — a miracle step.`,
          repair: 'Insert an intermediate measurement to bridge it, or downgrade the edge to correlational until proven.',
          status: 'open',
        })
      }
    }
  }

  // 3 · missing control — assay with no control arm
  for (const a of s.assays) {
    if (!a.controls || a.controls.trim() === '') {
      out.push({
        id: `inst_control_${a.id}`,
        type: 'missing_control',
        severity: 'high',
        target: a.id,
        targetLabel: a.method,
        signal: 'Assay has no declared control / input arm.',
        repair: 'Add a matched or isogenic control and an assay-level input (IgG, vehicle, spike-in).',
        status: 'open',
      })
    }
  }

  // 4 · assay mismatch — a cardiomyocyte-state claim measured in blood
  const cardiacHyp = new Set(
    s.hypotheses.filter((h) => /cardio|cardiac/i.test(h.requiresTissue ?? '')).map((h) => h.id),
  )
  for (const a of s.assays) {
    const inBlood = /blood/i.test(a.cellType)
    const claimsCardiac = (a.claims ?? []).some((c) => cardiacHyp.has(c))
    if (inBlood && claimsCardiac) {
      out.push({
        id: `inst_mismatch_${a.id}`,
        type: 'assay_mismatch',
        severity: 'med',
        target: a.id,
        targetLabel: a.method,
        signal: `Blood-derived readout used for a cardiomyocyte-state claim (${a.cellType}).`,
        repair: 'Move to iPSC-CM / cardiac tissue, or first validate blood–heart methylation concordance.',
        status: 'open',
      })
    }
  }

  // 5 · underpowered design — quantitative two-sample power (see lib/power.ts)
  for (const a of s.assays) {
    const rep = assayPowerReport(a)
    if (rep && !rep.adequate) {
      const severity: Severity = rep.power < 0.4 ? 'high' : 'med'
      const gw = a.genomeWide ? ` (genome-wide, ~${rep.tests.toLocaleString()} tests)` : ''
      out.push({
        id: `inst_power_${a.id}`,
        type: 'underpowered_design',
        severity,
        target: a.id,
        targetLabel: a.method,
        signal: `Power ≈ ${Math.round(rep.power * 100)}% to detect d=${rep.d} at α=${fmtAlpha(rep.alpha)}${gw} with n=${rep.nPerGroup}/group.`,
        repair: `Reach ≥${rep.requiredNPerGroup}/group (${rep.requiredTotalN} total), raise the detectable effect, or make a targeted locus the primary endpoint.`,
        status: 'open',
      })
    }
  }

  // 6 · literature gap — hypothesis with no supporting paper on record
  for (const h of s.hypotheses) {
    if (!h.supportingPapers || h.supportingPapers.length === 0) {
      out.push({
        id: `inst_litgap_${h.id}`,
        type: 'literature_gap',
        severity: 'med',
        target: h.id,
        targetLabel: h.label,
        signal: 'No supporting literature linked — novelty and prior art unverified.',
        repair: 'Deep-scan with Literature Radar; attach support/contradiction and position the novelty explicitly.',
        status: 'open',
      })
    }
  }

  // 7 · statistical ambiguity — no pre-registration / no primary endpoint
  if (!s.project.preRegistered || !s.project.primaryEndpoint) {
    out.push({
      id: 'inst_stats_project',
      type: 'statistical_ambiguity',
      severity: 'high',
      target: s.project.id,
      targetLabel: s.project.code,
      signal: !s.project.primaryEndpoint
        ? 'No pre-specified primary endpoint — analysis is unconstrained.'
        : 'Analysis plan is not pre-registered.',
      repair: 'Pre-register: fix primary/secondary endpoints, model covariates (e.g. medication), and set the FDR plan.',
      status: 'open',
    })
  }

  // 8 · infeasible protocol — too many high-effort assays stacked in one phase
  const byPhase = new Map<number, number>()
  for (const a of s.assays) {
    if (a.effort === 'high' && a.phase) byPhase.set(a.phase, (byPhase.get(a.phase) ?? 0) + 1)
  }
  for (const [phase, n] of byPhase) {
    if (n > HIGH_EFFORT_PER_PHASE) {
      out.push({
        id: `inst_feasible_p${phase}`,
        type: 'infeasible_protocol',
        severity: 'med',
        target: `phase-${phase}`,
        targetLabel: `Phase ${phase}`,
        signal: `${n} high-effort assays scheduled in phase ${phase} — timeline/bandwidth overrun.`,
        repair: 'De-scope and re-phase; recruit a core facility / collaborator; sequence the heavy assays across seasons.',
        status: 'open',
      })
    }
  }

  // 9 · manuscript-story weakness — central hypothesis has no causal-grade evidence to the phenotype
  const hasCausalToPhenotype = s.edges.some(
    (e) => (e.dst === 'phe_type1' || e.dst === 'phe_arr') && (e.evidence === 'causal' || e.evidence === 'established') && e.rel !== 'unmasks',
  )
  if (!hasCausalToPhenotype) {
    out.push({
      id: 'inst_story_project',
      type: 'manuscript_story_weakness',
      severity: 'high',
      target: s.project.id,
      targetLabel: 'central hypothesis',
      signal: 'Every edge into the clinical phenotype is association-only — no experiment converts it to mechanism.',
      repair: 'Add the one causal experiment (iPSC-CM demethylation / rescue + MEA) and frame utility via the biomarker.',
      status: 'open',
    })
  }

  // apply manual overrides (acknowledged / resolved)
  return out.map((i) => {
    const ov = s.instabilityOverrides[i.id]
    return ov ? { ...i, status: ov } : i
  })
}

const SEV_WEIGHT: Record<Severity, number> = { high: 3, med: 2, low: 1 }

// Overall stability (0..1). Open flags drag the chassis down; resolved ones don't.
export function stabilityScore(instabilities: Instability[]): number {
  const open = instabilities.filter((i) => i.status === 'open')
  if (instabilities.length === 0) return 1
  const penalty = open.reduce((sum, i) => sum + SEV_WEIGHT[i.severity], 0)
  const worst = instabilities.reduce((sum, i) => sum + SEV_WEIGHT[i.severity], 0)
  return Math.max(0, Math.round((1 - penalty / (worst + 6)) * 100) / 100)
}
