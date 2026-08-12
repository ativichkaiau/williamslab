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
    name: 'Epigenetic and Non-coding Regulatory Mechanisms of SCN5A in Brugada Syndrome',
    code: 'BrS-EPI',
    domain: 'Cardiovascular genetics · epigenetics · systematic review (Phase 1)',
    centralHypothesis:
      'In Brugada syndrome, epigenetic and non-coding regulation of SCN5A — promoter and enhancer DNA methylation, repressive histone/chromatin remodeling, cis-regulatory variation at the SCN5A–SCN10A enhancer, and microRNA/lncRNA-mediated repression — lowers Nav1.5 expression, sodium current (I_Na) and conduction reserve, contributing to the type-1 ECG and arrhythmic risk beyond, and additively to, SCN5A coding mutations. Phase 1 systematically synthesizes this evidence to rank the best-supported mechanisms and biomarker candidates for Phase-2 mechanistic validation.',
    preRegistered: false,
    primaryEndpoint: undefined,
    stage: 'Protocol',
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
      supportingPapers: ['paper_scn10a', 'paper_enhancer', 'paper_ipsc'],
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
    { id: 'assay_pyroseq', method: 'Pyrosequencing', measures: 'CpG methylation %', cellType: 'whole blood + iPSC-CM', controls: 'SCN5A-neg healthy', sampleN: 24, phase: 1, effort: 'low', genomeWide: false, expectedEffect: 1.3, status: 'running', claims: ['hyp_h1'] },
    { id: 'assay_rrbs', method: 'RRBS', measures: 'genome-wide methylation', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 6, phase: 1, effort: 'high', genomeWide: true, status: 'piloting', claims: ['hyp_h1', 'hyp_h2'] },
    { id: 'assay_rnaseq', method: 'RNA-seq + qRT-PCR', measures: 'Nav1.5 expression', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 12, phase: 1, effort: 'med', genomeWide: true, status: 'piloting', claims: ['hyp_h1', 'hyp_h3'] },
    { id: 'assay_smallrna', method: 'Small RNA-seq', measures: 'miRNA profile', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 12, phase: 1, effort: 'med', genomeWide: true, status: 'queued', claims: ['hyp_h3'] },
    { id: 'assay_cuttag', method: 'CUT&Tag', measures: 'H3K27me3 / H3K4me3 / H3K27ac', cellType: 'iPSC-CM', controls: 'IgG + spike-in', sampleN: 8, phase: 2, effort: 'high', genomeWide: true, status: 'queued', claims: ['hyp_h2'] },
    { id: 'assay_atac', method: 'ATAC-seq', measures: 'chromatin accessibility', cellType: 'iPSC-CM', controls: '', sampleN: 8, phase: 2, effort: 'high', genomeWide: true, status: 'queued', claims: ['hyp_h2'] },
    { id: 'assay_4c', method: '4C-seq @ SCN5A', measures: 'enhancer–promoter looping', cellType: 'iPSC-CM', controls: 'input', sampleN: 6, phase: 2, effort: 'high', genomeWide: false, status: 'design', claims: ['hyp_h2'] },
    { id: 'assay_patch', method: 'Patch clamp + MEA', measures: 'I_Na · conduction velocity', cellType: 'iPSC-CM', controls: 'isogenic corrected', sampleN: 3, phase: 3, effort: 'high', genomeWide: false, status: 'blocked', claims: ['hyp_h1', 'hyp_h3'] },
    { id: 'assay_drug', method: 'Drug challenge', measures: 'ajmaline / flecainide / quinidine response', cellType: 'iPSC-CM', controls: 'vehicle', sampleN: 6, phase: 3, effort: 'med', genomeWide: false, status: 'design', claims: ['hyp_h3'] },
  ],

  // ---- papers (real references pulled from PubMed) ----
  papers: [
    { id: 'paper_meth', pmid: '29202755', doi: '10.1186/s12929-017-0397-x', title: 'H558R, a common SCN5A polymorphism, modifies the clinical phenotype of Brugada syndrome by modulating DNA methylation of SCN5A promoters', authors: 'Matsumura H, Nakano Y, Ochi H et al.', journal: 'J Biomed Sci', year: 2017, stance: 'supports', targets: ['hyp_h1'], tags: ['methylation', 'SCN5A', 'J Biomed Sci'] },
    { id: 'paper_scn10a', pmid: '33910361', doi: '10.1161/CIRCULATIONAHA.121.054083', title: 'Variant intronic enhancer controls SCN10A-short expression and heart conduction', authors: 'Man JC, Bosada FM, Scholman KT et al.', journal: 'Circulation', year: 2021, stance: 'supports', targets: ['hyp_h2'], tags: ['enhancer', 'SCN10A', 'Circulation'] },
    { id: 'paper_enhancer', pmid: '22706305', doi: '10.1172/JCI62613', title: 'Genetic variation in T-box binding element functionally affects SCN5A/SCN10A enhancer', authors: 'van den Boogaard M, Wong LE, Tessadori F et al.', journal: 'J Clin Invest', year: 2012, stance: 'background', targets: ['hyp_h2'], tags: ['enhancer', 'SCN5A/SCN10A', 'JCI'] },
    { id: 'paper_ncrna', pmid: '26209011', doi: '10.1016/j.bbadis.2015.07.016', title: 'Post-transcriptional regulation of cardiac sodium channel gene SCN5A expression and function by miR-192-5p', authors: 'Zhao Y, Huang Y, Li W et al.', journal: 'Biochim Biophys Acta', year: 2015, stance: 'supports', targets: ['hyp_h3'], tags: ['miRNA', 'SCN5A', 'BBA'] },
    { id: 'paper_ipsc', pmid: '31106349', doi: '10.1093/europace/euz122', title: 'A cellular model of Brugada syndrome with SCN10A variants using human iPSC-derived cardiomyocytes', authors: 'El-Battrawy I, Albers S, Cyganek L et al.', journal: 'Europace', year: 2019, stance: 'background', targets: ['hyp_h2'], tags: ['iPSC-CM', 'SCN10A', 'Europace'] },
  ],

  // ---- systematic review & meta-analysis ----
  // Phase 1 evidence synthesis for the BrS project. Protocol only — no studies
  // seeded; run the search, screen, and add the included literature yourself.
  // A mechanism (PECO) review: continuous molecular markers are the headline
  // quantitative synthesis (SMD/Hedges' g), with dichotomous clinical outcomes
  // pooled as OR/RR where data allow. Every protocol field is editable in-app.
  review: {
    title:
      'Epigenetic and Non-coding Regulatory Mechanisms of SCN5A in Brugada Syndrome: A Systematic Review and Meta-analysis',
    question:
      'What epigenetic and non-coding regulatory mechanisms affecting SCN5A are associated with Brugada syndrome — its molecular phenotype, electrophysiological abnormalities, and clinical severity? Secondary questions: (1) do BrS cases differ from controls in SCN5A-related DNA methylation, non-coding RNA expression or regulatory markers; (2) do these regulatory alterations track SCN5A/Nav1.5 expression or sodium current (I_Na); (3) do they track ECG phenotype, conduction abnormalities, ventricular arrhythmia or clinical severity; (4) which mechanism or marker has evidence strong enough to become a Phase-2 experimental target?',
    pico: {
      p: 'Population / model — patients diagnosed with Brugada syndrome; non-BrS controls; patient-derived or iPSC-derived cardiomyocytes; and animal or cellular models of SCN5A regulation directly relevant to BrS (human clinical and experimental evidence kept as separate layers)',
      i: 'Exposure — epigenetic or non-coding regulatory alterations affecting SCN5A: DNA methylation, histone modifications, chromatin accessibility, chromatin architecture, enhancer/promoter activity, microRNAs, long non-coding and other ncRNAs, and non-coding regulatory variants with a functional effect on SCN5A (incl. the SCN5A–SCN10A regulatory locus)',
      c: 'Comparator — healthy / non-BrS controls, wild-type controls, unexposed / reference genotype, or baseline expression / regulatory state',
      o: 'Molecular — SCN5A mRNA, Nav1.5 protein, DNA methylation level, ncRNA expression, chromatin accessibility, histone marks, enhancer activity. Functional — I_Na, action-potential parameters, conduction velocity, EP abnormalities. Clinical — spontaneous vs drug-induced type-1 ECG, PR interval, QRS duration, ventricular arrhythmia/VF, syncope, SCA/SCD, clinical severity / risk phenotype',
    },
    inclusion: [
      'Original research articles',
      'Study of BrS, or a model directly relevant to BrS',
      'Investigates epigenetic / non-coding regulation affecting SCN5A or the SCN5A–SCN10A regulatory network',
      'Reports relevant molecular, electrophysiological or clinical outcomes',
      'Sufficient data for qualitative or quantitative extraction',
    ],
    exclusion: [
      'Narrative reviews, editorials, commentaries or conference abstracts without sufficient data',
      'Case reports without mechanistic or quantitative regulatory data',
      'Studies of coding mutation or channel biophysics only, with no regulatory mechanism',
      'SCN5A in other diseases with no link to BrS',
      'Duplicate or same-cohort reports without independent additional data',
    ],
    databases: ['PubMed / MEDLINE', 'Embase', 'Scopus', 'Web of Science'],
    // Three concept blocks AND'ed: (1) Brugada, (2) SCN5A / Nav1.5 / SCN10A,
    // (3) epigenetic & non-coding regulatory mechanisms — controlled vocabulary
    // (MeSH/Emtree) OR'd with free-text synonyms.
    searches: [
      {
        db: 'PubMed',
        query: `("Brugada Syndrome"[Mesh] OR "Brugada syndrome"[tiab] OR "Brugada pattern"[tiab] OR BrS[tiab]) AND (SCN5A[tiab] OR "Nav1.5"[tiab] OR "NaV1.5"[tiab] OR SCN10A[tiab] OR "NaV1.8"[tiab] OR "NAV1.8, Voltage-Gated Sodium Channel"[Mesh] OR "NAV1.5 Voltage-Gated Sodium Channel"[Mesh]) AND ("Epigenesis, Genetic"[Mesh] OR epigenetic*[tiab] OR "DNA Methylation"[Mesh] OR "DNA methylation"[tiab] OR "Histones"[Mesh] OR histone*[tiab] OR "Chromatin"[Mesh] OR chromatin[tiab] OR "Enhancer Elements, Genetic"[Mesh] OR enhancer*[tiab] OR "Promoter Regions, Genetic"[Mesh] OR promoter*[tiab] OR "RNA, Untranslated"[Mesh] OR "non-coding RNA"[tiab] OR "noncoding RNA"[tiab] OR "MicroRNAs"[Mesh] OR microRNA*[tiab] OR miRNA*[tiab] OR "RNA, Long Noncoding"[Mesh] OR lncRNA*[tiab] OR "long non-coding"[tiab] OR "gene regulation"[tiab] OR "Gene Expression Regulation"[Mesh] OR cis-regulatory[tiab])`,
      },
      {
        db: 'Embase',
        query: `('brugada syndrome'/exp OR 'brugada syndrome':ti,ab OR BrS:ti,ab) AND (SCN5A:ti,ab OR 'SCN5A gene'/exp OR 'Nav1.5':ti,ab OR SCN10A:ti,ab OR 'sodium channel Nav1.5'/exp) AND ('epigenetics'/exp OR epigenetic*:ti,ab OR 'DNA methylation'/exp OR 'DNA methylation':ti,ab OR 'histone'/exp OR histone*:ti,ab OR 'chromatin'/exp OR chromatin:ti,ab OR 'enhancer'/exp OR enhancer*:ti,ab OR promoter*:ti,ab OR 'noncoding RNA'/exp OR 'non-coding RNA':ti,ab OR 'microRNA'/exp OR microRNA*:ti,ab OR miRNA*:ti,ab OR 'long noncoding RNA'/exp OR lncRNA*:ti,ab OR 'gene regulation':ti,ab)`,
      },
      {
        db: 'Scopus',
        query: `TITLE-ABS-KEY(("Brugada syndrome" OR BrS) AND (SCN5A OR "Nav1.5" OR SCN10A) AND (epigenetic* OR "DNA methylation" OR histone* OR chromatin OR enhancer* OR promoter* OR "non-coding RNA" OR microRNA* OR miRNA* OR lncRNA* OR "gene regulation"))`,
      },
      {
        db: 'Web of Science',
        query: `TS=(("Brugada syndrome" OR BrS) AND (SCN5A OR "Nav1.5" OR SCN10A) AND (epigenetic* OR "DNA methylation" OR histone* OR chromatin OR enhancer* OR promoter* OR "non-coding RNA" OR microRNA* OR miRNA* OR lncRNA* OR "gene regulation"))`,
      },
      {
        db: 'Supplementary',
        query: `Backward + forward citation chasing of all included studies and relevant reviews; hand-search of cardiac electrophysiology / cardiovascular genetics journals.`,
      },
    ],
    registration: 'PROSPERO — to register before screening (Phase 1 evidence synthesis; protocol to PRISMA-P)',
    screenerUrl: 'https://vestrippn-srma-telemetry.vercel.app',
    outcomeLabel: 'Regulatory / molecular marker',
    indexLabel: 'Brugada syndrome',
    comparatorLabel: 'Control',
    // Headline synthesis is continuous molecular markers across differing assays
    // → SMD (Hedges' g). Switch to OR/RR on the Meta page for dichotomous outcomes.
    effect: 'SMD',
    model: 'random',
    // Mixed-design mechanism review — appraise with the instrument that fits each
    // study type (human observational, SYRCLE for animal, in-vitro appraisal);
    // human clinical and experimental evidence are kept in separate layers.
    robTool: 'Design-specific (observational · SYRCLE · in-vitro appraisal)',
    robDomains: ['Selection', 'Comparability', 'Measurement', 'Confounding', 'Reporting'],
    // Fill these in as you run the search and screen — the PRISMA diagram is
    // generated from them.
    prisma: {
      dbRecords: 0,
      otherRecords: 0,
      duplicates: 0,
      screened: 0,
      excludedScreen: 0,
      fullText: 0,
      fullTextExcluded: [],
      included: 0,
    },
    studies: [],
    // Diagnostic-accuracy sub-review (e.g. ajmaline challenge vs a
    // clinical-genetic reference standard) — add 2×2s on the Diagnostic MA page.
    dxStudies: [],
  },

  activity: [],
  instabilityOverrides: {},
}

// A minimal, valid project — the "New project / new review" template.
export function blankProject(id: string, name: string, code: string, opts?: { question?: string; index?: string; comparator?: string; outcome?: string }): ProjectState {
  return {
    project: { id, name, code, domain: 'Systematic review', centralHypothesis: '', preRegistered: false, primaryEndpoint: undefined, stage: 'Idea' },
    nodes: [],
    edges: [],
    hypotheses: [],
    assays: [],
    papers: [],
    review: {
      title: name,
      question: opts?.question ?? '',
      pico: { p: '', i: opts?.index ?? '', c: opts?.comparator ?? '', o: opts?.outcome ?? '' },
      inclusion: [],
      exclusion: [],
      databases: ['PubMed / MEDLINE', 'Embase', 'Cochrane CENTRAL'],
      searches: [],
      registration: 'PROSPERO — to register',
      screenerUrl: 'https://vestrippn-srma-telemetry.vercel.app',
      outcomeLabel: opts?.outcome ?? 'Outcome',
      indexLabel: opts?.index ?? 'Index',
      comparatorLabel: opts?.comparator ?? 'Comparator',
      effect: 'OR',
      model: 'random',
      robTool: 'Newcastle-Ottawa Scale',
      robDomains: ['Selection', 'Comparability', 'Outcome'],
      prisma: { dbRecords: 0, otherRecords: 0, duplicates: 0, screened: 0, excludedScreen: 0, fullText: 0, fullTextExcluded: [], included: 0 },
      studies: [],
    },
    activity: [],
    instabilityOverrides: {},
  }
}

// A second seeded project — demonstrates multiple reviews side by side.
export const seed2: ProjectState = blankProject('scn5a-risk', 'SCN5A mutation status and arrhythmic risk in Brugada Syndrome', 'SCN5A-RISK', {
  question: 'In Brugada Syndrome, is a pathogenic SCN5A variant associated with a higher risk of arrhythmic events?',
  index: 'SCN5A-positive',
  comparator: 'SCN5A-negative',
  outcome: 'Arrhythmic events',
})
