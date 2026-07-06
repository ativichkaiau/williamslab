import type { NodeType, Evidence, InstabilityType, Severity } from '../types'

// Williams 1993 (FW15C) node livery.
export const NODE_COLORS: Record<NodeType, string> = {
  Gene: '#1746d1',
  Variant: '#2f6bff',
  EpigeneticMark: '#7c3aed',
  RegulatoryRegion: '#a855f7',
  CellType: '#0891b2',
  Assay: '#0f9d6b',
  ClinicalPhenotype: '#e2001a',
  Drug: '#f59e0b',
  Paper: '#64748b',
  Hypothesis: '#0a1f6b',
  Figure: '#12b981',
  ManuscriptSection: '#334155',
}

export const nodeColor = (t: NodeType): string => NODE_COLORS[t] ?? '#64748b'

// Edge styling by evidence strength — how "planted" the causal link is.
export const EVIDENCE_STYLE: Record<Evidence, { color: string; dash?: string; label: string }> = {
  none: { color: '#cbd3e6', dash: '5 5', label: 'no evidence' },
  predicted: { color: '#f59e0b', dash: '6 5', label: 'predicted' },
  correlational: { color: '#f59e0b', label: 'correlational' },
  causal: { color: '#0f9d6b', label: 'causal' },
  established: { color: '#0a1f6b', label: 'established' },
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: '#12b981',
  med: '#f59e0b',
  high: '#e2001a',
}

export const INSTABILITY_LABEL: Record<InstabilityType, string> = {
  unclear_hypothesis: 'Unclear hypothesis',
  weak_mechanistic_chain: 'Weak mechanistic chain',
  missing_control: 'Missing control group',
  assay_mismatch: 'Assay mismatch',
  underpowered_design: 'Underpowered design',
  literature_gap: 'Literature gap',
  statistical_ambiguity: 'Statistical ambiguity',
  infeasible_protocol: 'Infeasible protocol',
  manuscript_story_weakness: 'Manuscript-story weakness',
}
