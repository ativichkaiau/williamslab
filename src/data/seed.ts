import type { ProjectState } from '../types'

// ============================================================
// Seed project — "Molecular Epigenetic Regulation of Sodium
// Channel Genes in Brugada Syndrome". Everything downstream
// (dashboard, sensors, graph) is derived from this one object.
// Paper identifiers are left blank on purpose — they are slots
// to fill from Literature Radar, not asserted citations.
// ============================================================

export const seed: ProjectState = {
  project: {
    id: 'brs-epi',
    name: 'Epigenetic Regulation of Na⁺-Channel Genes in Brugada Syndrome',
    code: 'BrS-EPI',
    domain: 'Cardiac electrophysiology · epigenetics',
    centralHypothesis:
      'In Brugada Syndrome, epigenetic dysregulation of sodium-channel loci (SCN5A/SCN10A) — promoter/enhancer DNA methylation, repressive histone remodeling, and ncRNA-mediated repression — reduces Nav1.5-dependent I_Na and conduction reserve, producing the type-1 ECG and arrhythmic risk independently of, and additively to, SCN5A coding mutations.',
    preRegistered: false,
    primaryEndpoint: undefined,
  },

  // ---- knowledge-graph nodes (x,y are layout hints in a 1000×640 space) ----
  nodes: [
    { id: 'mark_5mc', type: 'EpigeneticMark', label: '5mC', sublabel: 'DNA methylation', x: 250, y: 80 },
    { id: 'mark_h3k27me3', type: 'EpigeneticMark', label: 'H3K27me3', sublabel: 'repressive', x: 520, y: 66 },
    { id: 'ncrna_mir', type: 'EpigeneticMark', label: 'cardiac miRNA', sublabel: 'post-transcriptional', x: 810, y: 96 },
    { id: 'reg_scn10a_enh', type: 'RegulatoryRegion', label: 'SCN10A', sublabel: 'enhancer', x: 150, y: 220 },
    { id: 'reg_scn5a_prom', type: 'RegulatoryRegion', label: 'SCN5A', sublabel: 'promoter', x: 440, y: 205 },
    { id: 'mark_h3k27ac', type: 'EpigeneticMark', label: 'H3K27ac', sublabel: 'active enh.', x: 700, y: 200 },
    { id: 'gene_scn10a', type: 'Gene', label: 'SCN10A', sublabel: 'Nav1.8', x: 170, y: 345 },
    { id: 'gene_scn5a', type: 'Gene', label: 'SCN5A', sublabel: 'Nav1.5', x: 440, y: 345 },
    { id: 'hyp_h1', type: 'Hypothesis', label: 'H1', sublabel: '5mC ⊣ Nav1.5', x: 660, y: 340 },
    { id: 'cell_ipsc', type: 'CellType', label: 'iPSC-CM', sublabel: 'I_Na ↓', x: 440, y: 460 },
    { id: 'drug_ajmaline', type: 'Drug', label: 'ajmaline', sublabel: 'Na⁺ blocker', x: 770, y: 455 },
    { id: 'phe_type1', type: 'ClinicalPhenotype', label: 'Type-1', sublabel: 'coved ST', x: 380, y: 578 },
    { id: 'phe_arr', type: 'ClinicalPhenotype', label: 'Arrhythmia', sublabel: 'VT/VF · SCD', x: 660, y: 572 },
    { id: 'assay_pyroseq', type: 'Assay', label: 'pyroseq', sublabel: 'methylation', x: 70, y: 100 },
    { id: 'assay_cuttag', type: 'Assay', label: 'CUT&Tag', sublabel: 'histone', x: 910, y: 210 },
    { id: 'assay_patch', type: 'Assay', label: 'patch/MEA', sublabel: 'function', x: 250, y: 500 },
    { id: 'paper_meth', type: 'Paper', label: 'Paper', sublabel: 'methylation assoc.', x: 900, y: 360 },
  ],

  // ---- edges (node→node). evidence grades how "planted" the link is ----
  edges: [
    // causal chain (molecular → clinical)
    { id: 'e_meth_gene', src: 'mark_5mc', dst: 'gene_scn5a', rel: 'represses', evidence: 'correlational', strength: 0.42, testedBy: ['assay_pyroseq', 'assay_rnaseq'] },
    { id: 'e_gene_ipsc', src: 'gene_scn5a', dst: 'cell_ipsc', rel: 'reduces', evidence: 'predicted', strength: 0.35, testedBy: ['assay_patch'] },
    { id: 'e_ipsc_type1', src: 'cell_ipsc', dst: 'phe_type1', rel: 'associated_with', evidence: 'predicted', strength: 0.28 }, // ← no assay bridges this yet (weak link)
    { id: 'e_type1_arr', src: 'phe_type1', dst: 'phe_arr', rel: 'associated_with', evidence: 'correlational', strength: 0.55 },
    // regulatory wiring
    { id: 'e_prom_gene', src: 'reg_scn5a_prom', dst: 'gene_scn5a', rel: 'regulates', evidence: 'established', strength: 0.9 },
    { id: 'e_enh_loop', src: 'reg_scn10a_enh', dst: 'reg_scn5a_prom', rel: 'loops_to', evidence: 'predicted', strength: 0.3, testedBy: ['assay_4c'] },
    { id: 'e_enh_gene', src: 'reg_scn10a_enh', dst: 'gene_scn5a', rel: 'regulates', evidence: 'correlational', strength: 0.4 },
    { id: 'e_5mc_prom', src: 'mark_5mc', dst: 'reg_scn5a_prom', rel: 'deposited_on', evidence: 'correlational', strength: 0.45, testedBy: ['assay_pyroseq'] },
    { id: 'e_k27me3_prom', src: 'mark_h3k27me3', dst: 'reg_scn5a_prom', rel: 'deposited_on', evidence: 'predicted', strength: 0.3, testedBy: ['assay_cuttag'] },
    { id: 'e_k27ac_enh', src: 'mark_h3k27ac', dst: 'reg_scn10a_enh', rel: 'deposited_on', evidence: 'predicted', strength: 0.3, testedBy: ['assay_cuttag'] },
    { id: 'e_mir_gene', src: 'ncrna_mir', dst: 'gene_scn5a', rel: 'represses', evidence: 'predicted', strength: 0.3, testedBy: ['assay_smallrna'] },
    // drug axis
    { id: 'e_drug_gene', src: 'drug_ajmaline', dst: 'gene_scn5a', rel: 'modulates', evidence: 'established', strength: 0.9 },
    { id: 'e_drug_type1', src: 'drug_ajmaline', dst: 'phe_type1', rel: 'unmasks', evidence: 'established', strength: 0.85 },
    // assays / evidence
    { id: 'e_measure_5mc', src: 'mark_5mc', dst: 'assay_pyroseq', rel: 'measured_by', evidence: 'established', strength: 0.9 },
    { id: 'e_measure_k27', src: 'mark_h3k27me3', dst: 'assay_cuttag', rel: 'measured_by', evidence: 'established', strength: 0.9 },
    { id: 'e_patch_ipsc', src: 'assay_patch', dst: 'cell_ipsc', rel: 'performed_in', evidence: 'established', strength: 0.9 },
    { id: 'e_paper_h1', src: 'paper_meth', dst: 'hyp_h1', rel: 'supports', evidence: 'correlational', strength: 0.4 },
    { id: 'e_h1_gene', src: 'hyp_h1', dst: 'gene_scn5a', rel: 'predicts', evidence: 'predicted', strength: 0.4 },
  ],

  // ---- hypotheses ----
  hypotheses: [
    {
      id: 'hyp_h1',
      label: 'H1 · SCN5A promoter methylation ⊣ Nav1.5',
      statement:
        'Higher SCN5A-promoter DNA methylation in spontaneous type-1 Brugada patients reduces Nav1.5 mRNA/protein and I_Na, independent of SCN5A coding status.',
      prediction: { direction: 'negative', effect: '≥25% ↓ Nav1.5 mRNA per unit methylation' },
      falsification: 'No methylation–expression correlation at FDR < 0.05 in patients vs SCN5A-negative controls.',
      status: 'testing',
      supportingPapers: ['paper_meth'],
      asserts: ['e_meth_gene', 'e_gene_ipsc'],
      requiresTissue: 'cardiomyocyte',
    },
    {
      id: 'hyp_h2',
      label: 'H2 · Repressive chromatin at Na⁺-channel loci',
      statement:
        'Spontaneous type-1 Brugada shows increased H3K27me3, decreased H3K27ac, and reduced chromatin accessibility at SCN5A/SCN10A regulatory regions relative to controls.',
      prediction: { direction: 'negative', effect: '↑ H3K27me3 + ↓ ATAC signal at SCN5A/SCN10A' },
      falsification: 'No differential histone marks or accessibility between spontaneous type-1 and controls.',
      status: 'draft',
      supportingPapers: [], // ← literature-gap sensor will flag this
      asserts: ['e_k27me3_prom', 'e_k27ac_enh', 'e_enh_loop'],
      requiresTissue: 'cardiomyocyte',
    },
    {
      id: 'hyp_h3',
      label: 'H3 · Cardiac ncRNAs repress Nav1.5',
      statement:
        'A panel of cardiac-enriched miRNAs is upregulated in Brugada cardiomyocytes and post-transcriptionally represses Nav1.5, tracking arrhythmic burden.',
      prediction: { direction: 'negative', effect: 'candidate miRNA level inversely tracks Nav1.5' },
      // falsification intentionally missing → unclear-hypothesis sensor will flag this
      status: 'draft',
      supportingPapers: ['paper_ncrna'],
      asserts: ['e_mir_gene'],
      requiresTissue: 'cardiomyocyte',
    },
  ],

  // ---- assays ----
  assays: [
    { id: 'assay_pyroseq', method: 'Pyrosequencing', measures: 'CpG methylation %', cellType: 'whole blood + iPSC-CM', controls: 'SCN5A-neg healthy', sampleN: 24, phase: 1, effort: 'low', genomeWide: false, status: 'running', claims: ['hyp_h1'] },
    { id: 'assay_rrbs', method: 'RRBS', measures: 'genome-wide methylation', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 6, phase: 1, effort: 'high', genomeWide: true, status: 'piloting', claims: ['hyp_h1', 'hyp_h2'] },
    { id: 'assay_rnaseq', method: 'RNA-seq + qRT-PCR', measures: 'Nav1.5 expression', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 12, phase: 1, effort: 'med', genomeWide: true, status: 'piloting', claims: ['hyp_h1', 'hyp_h3'] },
    { id: 'assay_smallrna', method: 'Small RNA-seq', measures: 'miRNA profile', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 12, phase: 1, effort: 'med', genomeWide: true, status: 'queued', claims: ['hyp_h3'] },
    { id: 'assay_cuttag', method: 'CUT&Tag', measures: 'H3K27me3 / H3K4me3 / H3K27ac', cellType: 'iPSC-CM', controls: 'IgG + spike-in', sampleN: 8, phase: 2, effort: 'high', genomeWide: true, status: 'queued', claims: ['hyp_h2'] },
    { id: 'assay_atac', method: 'ATAC-seq', measures: 'chromatin accessibility', cellType: 'iPSC-CM', controls: '', sampleN: 8, phase: 2, effort: 'high', genomeWide: true, status: 'queued', claims: ['hyp_h2'] },
    { id: 'assay_4c', method: '4C-seq @ SCN5A', measures: 'enhancer–promoter looping', cellType: 'iPSC-CM', controls: 'input', sampleN: 6, phase: 2, effort: 'high', genomeWide: false, status: 'design', claims: ['hyp_h2'] },
    { id: 'assay_patch', method: 'Patch clamp + MEA', measures: 'I_Na · conduction velocity', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 3, phase: 3, effort: 'high', genomeWide: false, status: 'blocked', claims: ['hyp_h1', 'hyp_h3'] },
    { id: 'assay_drug', method: 'Drug challenge', measures: 'ajmaline / flecainide / quinidine response', cellType: 'iPSC-CM', controls: 'vehicle', sampleN: 6, phase: 3, effort: 'med', genomeWide: false, status: 'design', claims: ['hyp_h3'] },
  ],

  // ---- papers (identifiers to be filled from Literature Radar) ----
  papers: [
    { id: 'paper_meth', title: 'SCN5A promoter methylation associated with Brugada phenotype (association study)', year: 2021, stance: 'supports', targets: ['hyp_h1'], tags: ['methylation', 'SCN5A'] },
    { id: 'paper_scn10a', title: 'SCN10A regulatory variation modifies cardiac conduction & Brugada risk (GWAS)', year: 2013, stance: 'background', targets: ['hyp_h2'], tags: ['SCN10A', 'GWAS', 'enhancer'] },
    { id: 'paper_ncrna', title: 'Cardiac miRNAs post-transcriptionally regulate Nav1.5 (review)', year: 2019, stance: 'background', targets: ['hyp_h3'], tags: ['miRNA', 'Nav1.5'] },
  ],

  instabilityOverrides: {},
}
