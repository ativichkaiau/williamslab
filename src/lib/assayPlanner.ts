import type { EdgeRel, NodeType } from '../types'

// "Bridge the weak link" — given a causal edge, suggest the assay that would
// upgrade it from predicted/correlational toward causal. Keyed by the relation,
// with node types as a fallback. This is the Assay-Planner logic surfaced on the
// Mechanism Map.

export interface AssaySuggestion {
  method: string
  measures: string
  cellType: string
  why: string
}

export function suggestAssay(rel: EdgeRel, srcType?: NodeType, dstType?: NodeType): AssaySuggestion {
  switch (rel) {
    case 'deposited_on':
      return { method: 'CUT&Tag', measures: 'histone-mark occupancy at the locus', cellType: 'iPSC-CM', why: 'directly shows whether the mark sits on this region' }
    case 'loops_to':
      return { method: '4C-seq', measures: 'enhancer–promoter contact frequency', cellType: 'iPSC-CM', why: 'tests the physical looping this edge claims' }
    case 'represses':
    case 'reduces':
      return { method: 'RRBS + RNA-seq', measures: 'DNA methylation vs Naᵥ1.5 expression', cellType: 'iPSC-CM', why: 'quantifies the repression this edge asserts' }
    case 'regulates':
      return { method: 'MPRA / reporter assay', measures: 'regulatory activity of the element', cellType: 'iPSC-CM', why: 'shows the element actually regulates transcription' }
    case 'modulates':
    case 'unmasks':
      return { method: 'Drug challenge + MEA', measures: 'conduction / phenotype response', cellType: 'iPSC-CM monolayer', why: 'tests the functional modulation directly' }
    case 'associated_with':
      return { method: 'Case–control methylation assay', measures: 'locus methylation stratified by phenotype', cellType: 'patient tissue', why: 'establishes the association with adequate power' }
    default:
      break
  }
  // fall back on the node types
  if (dstType === 'ClinicalPhenotype') return { method: 'iPSC-CM demethylation + MEA', measures: 'conduction / arrhythmia read-out', cellType: 'iPSC-CM', why: 'converts association into a causal, functional claim' }
  if (srcType === 'EpigeneticMark') return { method: 'CUT&Tag / RRBS', measures: 'mark occupancy or methylation at the target', cellType: 'iPSC-CM', why: 'measures the epigenetic state this edge depends on' }
  return { method: 'iPSC-CM patch clamp', measures: 'I_Na density', cellType: 'iPSC-CM', why: 'measures the functional consequence of this step' }
}
