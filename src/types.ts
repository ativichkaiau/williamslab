// WilliamsLab — research knowledge-graph schema.
// Everything in the app is a typed node, a typed edge, or a view over them.

export type NodeType =
  | 'Gene'
  | 'Variant'
  | 'EpigeneticMark'
  | 'RegulatoryRegion'
  | 'CellType'
  | 'Assay'
  | 'ClinicalPhenotype'
  | 'Drug'
  | 'Paper'
  | 'Hypothesis'
  | 'Figure'
  | 'ManuscriptSection'

export type EdgeRel =
  | 'encodes'
  | 'regulates'
  | 'loops_to'
  | 'deposited_on'
  | 'represses'
  | 'reduces'
  | 'measured_by'
  | 'performed_in'
  | 'modulates'
  | 'unmasks'
  | 'associated_with'
  | 'predicts'
  | 'tested_by'
  | 'supports'
  | 'refutes'
  | 'visualizes'
  | 'argues'

// How much do we believe a causal edge? Drives the "weak mechanistic chain" sensor.
export type Evidence = 'none' | 'predicted' | 'correlational' | 'causal' | 'established'

export interface GraphNode {
  id: string
  type: NodeType
  label: string
  sublabel?: string
  x?: number // layout hint (0..1000) for graph views
  y?: number // layout hint (0..640)
  props?: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  src: string
  dst: string
  rel: EdgeRel
  evidence?: Evidence
  strength?: number // 0..1 confidence
  testedBy?: string[] // assay node ids that would bridge this edge
}

export type HypothesisStatus = 'draft' | 'testing' | 'supported' | 'refuted'

export interface Hypothesis {
  id: string // also a GraphNode id (type Hypothesis)
  label: string
  statement: string
  prediction?: { direction: 'positive' | 'negative' | 'none'; effect?: string }
  falsification?: string
  status: HypothesisStatus
  supportingPapers?: string[] // Paper ids
  asserts?: string[] // GraphEdge ids this hypothesis claims
  requiresTissue?: string // e.g. "cardiomyocyte" — used by the assay-mismatch sensor
}

export type AssayStatus = 'design' | 'queued' | 'piloting' | 'running' | 'done' | 'blocked'

export interface Assay {
  id: string // also a GraphNode id (type Assay)
  method: string
  measures: string
  cellType: string
  controls?: string
  sampleN?: number
  phase?: 1 | 2 | 3
  effort?: 'low' | 'med' | 'high'
  genomeWide?: boolean // targeted vs genome-wide — drives the power sensor
  status: AssayStatus
  claims?: string[] // Hypothesis ids this assay addresses
}

export interface Paper {
  id: string // also a GraphNode id (type Paper)
  pmid?: string
  doi?: string
  title: string
  year?: number
  stance?: 'supports' | 'refutes' | 'background'
  targets?: string[] // Hypothesis ids
  tags?: string[]
}

export type InstabilityType =
  | 'unclear_hypothesis'
  | 'weak_mechanistic_chain'
  | 'missing_control'
  | 'assay_mismatch'
  | 'underpowered_design'
  | 'literature_gap'
  | 'statistical_ambiguity'
  | 'infeasible_protocol'
  | 'manuscript_story_weakness'

export type Severity = 'low' | 'med' | 'high'

export interface Instability {
  id: string
  type: InstabilityType
  severity: Severity
  target: string // node/edge id
  targetLabel?: string
  signal: string // the warning sign (telemetry)
  repair: string // the counter-actuation
  status: 'open' | 'acknowledged' | 'resolved'
}

export interface Project {
  id: string
  name: string
  code: string
  domain: string
  centralHypothesis: string
  preRegistered: boolean
  primaryEndpoint?: string
}

export interface ProjectState {
  project: Project
  nodes: GraphNode[]
  edges: GraphEdge[]
  hypotheses: Hypothesis[]
  assays: Assay[]
  papers: Paper[]
  // manually-acknowledged/resolved instabilities keyed by id (rules recompute the rest)
  instabilityOverrides: Record<string, 'acknowledged' | 'resolved'>
}
