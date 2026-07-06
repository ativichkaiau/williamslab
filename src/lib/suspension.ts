import type { ProjectState, Instability, Severity } from '../types'
import { assayPowerReport, fmtAlpha } from './power'

// ============================================================
// Rigor Monitor — the study-design check engine.
// Pure functions over ProjectState → findings. Each finding
// carries a one-line signal, a substantive reviewer comment
// grounded in the actual project data, and a concrete fix.
// ============================================================

const HIGH_EFFORT_PER_PHASE = 2

export function computeInstabilities(s: ProjectState): Instability[] {
  const out: Instability[] = []
  const edgeById = new Map(s.edges.map((e) => [e.id, e]))
  const nodeLabel = (id: string) => s.nodes.find((n) => n.id === id)?.label ?? id

  // 1 · unclear hypothesis
  for (const h of s.hypotheses) {
    const noFalsify = !h.falsification
    const noDir = !h.prediction || h.prediction.direction === 'none'
    if (noFalsify || noDir) {
      out.push({
        id: `inst_unclear_${h.id}`,
        type: 'unclear_hypothesis',
        severity: 'high',
        target: h.id,
        targetLabel: h.label,
        signal: noFalsify ? 'No falsification criterion.' : 'No predicted direction.',
        comment: noFalsify
          ? `${h.label} states a mechanism but no criterion that would disprove it. As written it can be illustrated but not tested — any result can be read as consistent with it. Define the specific observation (e.g. "no inverse miRNA–Nav1.5 correlation at FDR < 0.05 in n ≥ 12") that would force you to abandon it.`
          : `${h.label} has no pre-specified direction or effect size, so it cannot be confirmed or refuted quantitatively. State whether the effect is positive or negative and how large you expect it to be.`,
        repair: 'Rewrite as if/then with a direction, an effect size, and the observation that would kill it.',
        status: 'open',
      })
    }
  }

  // 2 · weak mechanistic chain
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
          targetLabel: `${nodeLabel(e.src)} → ${nodeLabel(e.dst)}`,
          signal: `"${e.evidence}" edge with no assay.`,
          comment: `The step ${nodeLabel(e.src)} —${e.rel}→ ${nodeLabel(e.dst)}, asserted by ${h.label}, currently rests on "${e.evidence}" evidence with no assay attached. This is the link that turns correlation into causation, so the entire causal claim inherits its uncertainty. Until an experiment bridges it, the chain is only as strong as this weakest edge.`,
          repair: 'Attach an assay that measures this step directly, or downgrade the edge to correlational until one exists.',
          status: 'open',
        })
      }
    }
  }

  // 3 · missing control
  for (const a of s.assays) {
    if (!a.controls || a.controls.trim() === '') {
      out.push({
        id: `inst_control_${a.id}`,
        type: 'missing_control',
        severity: 'high',
        target: a.id,
        targetLabel: a.method,
        signal: 'No control / input arm.',
        comment: `${a.method} (${a.measures}) has no comparator or input declared. Without a matched control — and, for this assay class, an input/IgG/spike-in — any signal cannot be separated from batch, technical or baseline variation, so a differential result is uninterpretable. This is a first-pass reason reviewers reject a comparison.`,
        repair: 'Add a matched or isogenic control plus the assay-level input (IgG, vehicle, spike-in).',
        status: 'open',
      })
    }
  }

  // 4 · assay mismatch (cardiomyocyte claim measured in blood)
  const cardiacHyp = new Set(s.hypotheses.filter((h) => /cardio|cardiac/i.test(h.requiresTissue ?? '')).map((h) => h.id))
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
        signal: 'Cardiac claim read in blood.',
        comment: `${a.method} is run in "${a.cellType}", but the hypotheses it addresses are about cardiomyocyte regulation. Blood methylation is a tissue-discordant proxy for cardiac chromatin state — concordance at these loci is not guaranteed and often poor. A cardiac claim built on a blood read-out is a predictable reviewer objection.`,
        repair: 'Move to iPSC-CM / cardiac tissue, or first demonstrate blood–heart concordance at these loci.',
        status: 'open',
      })
    }
  }

  // 5 · underpowered design (quantitative)
  for (const a of s.assays) {
    const rep = assayPowerReport(a)
    if (rep && !rep.adequate) {
      const severity: Severity = rep.power < 0.4 ? 'high' : 'med'
      const gw = a.genomeWide ? ` across ~${rep.tests.toLocaleString()} genome-wide tests` : ''
      out.push({
        id: `inst_power_${a.id}`,
        type: 'underpowered_design',
        severity,
        target: a.id,
        targetLabel: a.method,
        signal: `~${Math.round(rep.power * 100)}% power at n=${a.sampleN}.`,
        comment: `At n=${a.sampleN} (${rep.nPerGroup}/group) and an expected effect of d=${rep.d}, ${a.method} reaches only ~${Math.round(rep.power * 100)}% power against a per-test α of ${fmtAlpha(rep.alpha)}${gw}. Reaching 80% would need ≥${rep.requiredNPerGroup}/group (${rep.requiredTotalN} total). As specified, this arm can generate hypotheses but cannot support a confirmatory claim, and a null result would be uninformative.`,
        repair: `Make a targeted locus the primary endpoint (treat this as discovery), raise the detectable effect, or scale to ≥${rep.requiredTotalN} total.`,
        status: 'open',
      })
    }
  }

  // 6 · literature gap
  for (const h of s.hypotheses) {
    if (!h.supportingPapers || h.supportingPapers.length === 0) {
      out.push({
        id: `inst_litgap_${h.id}`,
        type: 'literature_gap',
        severity: 'med',
        target: h.id,
        targetLabel: h.label,
        signal: 'No literature attached.',
        comment: `${h.label} has no supporting or contradicting reference on record. Either the prior art is unverified — risking redundancy or an unnoticed refutation — or the novelty is simply unstated. An unsituated hypothesis is hard to fund and easy to scoop.`,
        repair: 'Run a Literature scan and attach support/contradiction; state the novelty explicitly.',
        status: 'open',
      })
    }
  }

  // 7 · statistical ambiguity
  if (!s.project.preRegistered || !s.project.primaryEndpoint) {
    out.push({
      id: 'inst_stats_project',
      type: 'statistical_ambiguity',
      severity: 'high',
      target: s.project.id,
      targetLabel: s.project.code,
      signal: !s.project.primaryEndpoint ? 'No primary endpoint set.' : 'Not pre-registered.',
      comment: `The project has ${!s.project.primaryEndpoint ? 'no pre-specified primary endpoint' : 'no pre-registered analysis plan'}. With genome-wide data and several candidate loci, undeclared analytic flexibility is a garden-of-forking-paths problem — it inflates false positives and undermines any p-value you report. Na⁺-channel-blocker medication is a live confounder of methylation that must be modelled, not discovered post hoc.`,
      repair: 'Pre-register: fix the primary/secondary endpoints, the covariate set (incl. medication), and the FDR plan before unblinding.',
      status: 'open',
    })
  }

  // 8 · infeasible protocol
  const phaseAssays = new Map<number, string[]>()
  for (const a of s.assays) {
    if (a.effort === 'high' && a.phase) {
      if (!phaseAssays.has(a.phase)) phaseAssays.set(a.phase, [])
      phaseAssays.get(a.phase)!.push(a.method)
    }
  }
  for (const [phase, methods] of phaseAssays) {
    if (methods.length > HIGH_EFFORT_PER_PHASE) {
      out.push({
        id: `inst_feasible_p${phase}`,
        type: 'infeasible_protocol',
        severity: 'med',
        target: `phase-${phase}`,
        targetLabel: `Phase ${phase}`,
        signal: `${methods.length} high-effort assays in phase ${phase}.`,
        comment: `Phase ${phase} stacks ${methods.length} high-effort assays (${methods.join(', ')}). Run in parallel by one team inside a single phase, the timeline, sample volume and hands-on bandwidth are unrealistic and quality will slip. Heavy chromatin and functional assays in particular each need dedicated optimisation.`,
        repair: 'Sequence the heavy assays across phases, or bring in a core facility / collaborator for one of them.',
        status: 'open',
      })
    }
  }

  // 9 · manuscript-story weakness
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
      signal: 'Association-only into the phenotype.',
      comment: `Every edge running into the clinical phenotype is association-grade — nothing yet shows that changing methylation causally changes I_Na, conduction or the ECG. The manuscript would read as "epigenetic marks correlate with Brugada," which reviewers will call descriptive and decline for a high-impact venue. One causal experiment converts the whole story.`,
      repair: 'Add an iPSC-CM demethylation / rescue experiment with MEA conduction read-out, and frame clinical utility via the biomarker.',
      status: 'open',
    })
  }

  return out.map((i) => {
    const ov = s.instabilityOverrides[i.id]
    return ov ? { ...i, status: ov } : i
  })
}

const SEV_WEIGHT: Record<Severity, number> = { high: 3, med: 2, low: 1 }

export function stabilityScore(instabilities: Instability[]): number {
  const open = instabilities.filter((i) => i.status === 'open')
  if (instabilities.length === 0) return 1
  const penalty = open.reduce((sum, i) => sum + SEV_WEIGHT[i.severity], 0)
  const worst = instabilities.reduce((sum, i) => sum + SEV_WEIGHT[i.severity], 0)
  return Math.max(0, Math.round((1 - penalty / (worst + 6)) * 100) / 100)
}
