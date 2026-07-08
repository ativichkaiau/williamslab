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
  expectedEffect?: number // Cohen's d you expect to detect (default 0.8)
  genomeWideTests?: number // approx # of simultaneous tests for multiple-testing correction
  costK?: number // estimated cost, thousands of USD
  weeks?: number // estimated bench duration, weeks
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
  | 'srma_gap'

export type Severity = 'low' | 'med' | 'high'

export interface Instability {
  id: string
  type: InstabilityType
  severity: Severity
  target: string // node/edge id
  targetLabel?: string
  signal: string // one-line warning sign
  comment: string // substantive reviewer comment — the specific problem, in context
  repair: string // the concrete fix
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
  stage?: string // current lifecycle step (see STAGES)
}

export interface ActivityEntry {
  id: string
  ts: number
  kind: string
  text: string
}

export const STAGES = ['Idea', 'Concept', 'Lit review', 'Protocol', 'Ethics', 'Data', 'Analysis', 'Synthesis', 'Manuscript', 'Submitted'] as const

// ---- systematic review & meta-analysis (SRMA) ----
export type RobLevel = 'low' | 'some' | 'high'

export interface Study {
  id: string
  author: string
  year: number
  pmid?: string
  design?: string
  // 2×2 for a binary outcome (OR / RR / RD): exposed = index, ctrl = comparator
  expEvents?: number
  expTotal?: number
  ctrlEvents?: number
  ctrlTotal?: number
  // continuous outcome (SMD): mean / SD / n per group
  mean1?: number
  sd1?: number
  n1?: number
  mean2?: number
  sd2?: number
  n2?: number
  rob?: Record<string, RobLevel>
  subgroup?: string // free-text subgroup label for subgroup analysis
  include: boolean // counts toward the pooled estimate
  note?: string
}

export type EffectMeasure = 'OR' | 'RR' | 'RD' | 'SMD'

export type GradeJudgment = 'not serious' | 'serious' | 'very serious'
export interface GradeState {
  design: 'observational' | 'rct'
  rob?: GradeJudgment
  inconsistency?: GradeJudgment
  indirectness?: GradeJudgment
  imprecision?: GradeJudgment
  pubBias?: 'undetected' | 'serious'
  largeEffect?: 'none' | 'large' | 'very large'
}

export interface Review {
  title: string
  question: string
  pico: { p: string; i: string; c: string; o: string }
  inclusion: string[]
  exclusion: string[]
  databases: string[]
  searches: { db: string; query: string }[]
  registration?: string
  screenerUrl: string
  outcomeLabel: string
  indexLabel: string // the exposed/index group
  comparatorLabel: string
  effect: EffectMeasure
  model: 'random' | 'fixed'
  robDomains: string[]
  grade?: GradeState
  dualExtraction?: boolean // data extracted in duplicate (AMSTAR-2 item 6)
  amstar?: Record<string, 'yes' | 'partial' | 'no'> // AMSTAR-2 self-assessment
  prisma: {
    dbRecords: number
    otherRecords: number
    duplicates: number
    screened: number
    excludedScreen: number
    fullText: number
    fullTextExcluded: { reason: string; n: number }[]
    included: number
  }
  studies: Study[]
}

export interface ProjectState {
  project: Project
  nodes: GraphNode[]
  edges: GraphEdge[]
  hypotheses: Hypothesis[]
  assays: Assay[]
  papers: Paper[]
  review: Review
  activity: ActivityEntry[]
  // manually-acknowledged/resolved instabilities keyed by id (rules recompute the rest)
  instabilityOverrides: Record<string, 'acknowledged' | 'resolved'>
}
