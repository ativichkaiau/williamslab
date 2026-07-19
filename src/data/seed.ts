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
  // Real PubMed identities from the search. 2×2 event counts and risk-of-bias
  // ratings are intentionally empty — extract and rate them on the Studies page.
  review: {
    title:
      'Spontaneous versus drug-induced type-1 electrocardiographic pattern and major arrhythmic events in Brugada syndrome: a systematic review and meta-analysis of cohort studies',
    // Prognostic-factor question, framed PICOTS. The adjustment clause matters:
    // the crude association is well described — the open question is whether it
    // survives correction for the established risk markers.
    question:
      'In adults with Brugada syndrome, is a spontaneous type-1 ECG pattern — versus a type-1 pattern elicited only by sodium-channel-blocker provocation — associated with a higher rate of major arrhythmic events during follow-up, and does that association persist after adjustment for syncope, prior cardiac arrest and SCN5A status?',
    pico: {
      p: 'Adults (≥18 y) with Brugada syndrome, diagnosed by a type-1 pattern — coved ST-elevation ≥2 mm in ≥1 right precordial lead (V1–V2, standard or high position) — arising spontaneously or on provocation',
      i: 'Spontaneous type-1 pattern: documented on ≥1 baseline or ambulatory ECG without drug provocation (fever-induced patterns extracted separately for subgroup analysis)',
      c: 'Drug-induced type-1 only: pattern manifest solely after ajmaline, flecainide, procainamide or pilsicainide challenge, never spontaneously',
      o: 'Primary — major arrhythmic events: sudden cardiac death, documented ventricular fibrillation or sustained ventricular tachycardia, aborted cardiac arrest, or appropriate ICD therapy. Secondary — arrhythmic syncope; all-cause mortality',
    },
    inclusion: [
      'Design: prospective or retrospective cohort studies, registries, or case-control nested within a cohort',
      'Population: adults (≥18 y) meeting contemporary criteria (2013 HRS/EHRA/APHRS or 2022 ESC consensus)',
      'Exposure: spontaneous vs drug-induced type-1 status explicitly distinguished and reported',
      'Outcome: ≥1 major arrhythmic event reported separately for each exposure group',
      'Follow-up: mean or median ≥12 months',
      'Data: extractable 2×2 counts, events with person-time, or an adjusted HR/OR with 95% CI',
      'No language or date restriction — translation sought where required',
    ],
    exclusion: [
      'Case reports or case series with n < 10',
      'Outcomes not stratified by spontaneous vs drug-induced type-1 status',
      'Reviews, editorials or conference abstracts without extractable outcome data',
      'Overlapping / duplicate cohorts — retain the largest or most complete, and document the decision',
      'Exclusively paediatric cohorts (<18 y)',
      'Type-2/type-3 (saddleback) patterns only, or a Brugada ECG pattern in unselected populations without a syndrome diagnosis',
    ],
    databases: ['PubMed / MEDLINE', 'Embase', 'Cochrane CENTRAL', 'Web of Science Core Collection', 'Scopus', 'ClinicalTrials.gov', 'WHO ICTRP'],
    // Fully spelled-out strategies: controlled vocabulary (MeSH/Emtree) OR'd
    // with free-text synonyms, three concept blocks AND'ed together.
    searches: [
      {
        db: 'PubMed',
        query: `("Brugada Syndrome"[Mesh] OR "Brugada syndrome"[tiab] OR "Brugada pattern"[tiab] OR "Brugada sign"[tiab] OR "type 1 Brugada"[tiab] OR "coved ST"[tiab]) AND (spontaneous*[tiab] OR "drug induced"[tiab] OR drug-induced[tiab] OR provocation[tiab] OR provocative[tiab] OR challenge[tiab] OR unmask*[tiab] OR ajmaline[tiab] OR flecainide[tiab] OR procainamide[tiab] OR pilsicainide[tiab] OR "Sodium Channel Blockers"[Mesh]) AND ("Death, Sudden, Cardiac"[Mesh] OR "Ventricular Fibrillation"[Mesh] OR "Tachycardia, Ventricular"[Mesh] OR "Defibrillators, Implantable"[Mesh] OR "arrhythmic event*"[tiab] OR "ventricular fibrillation"[tiab] OR "ventricular tachycardia"[tiab] OR "sudden cardiac death"[tiab] OR "cardiac arrest"[tiab] OR "appropriate shock*"[tiab] OR "ICD therap*"[tiab] OR prognos*[tiab] OR "risk stratification"[tiab]) NOT "Case Reports"[pt]`,
      },
      {
        db: 'Embase',
        query: `'brugada syndrome'/exp AND (spontaneous*:ti,ab OR 'drug induced':ti,ab OR 'provocation test':ti,ab OR unmask*:ti,ab OR ajmaline/exp OR flecainide/exp OR procainamide/exp OR pilsicainide/exp) AND ('sudden cardiac death'/exp OR 'heart ventricle fibrillation'/exp OR 'heart ventricle tachycardia'/exp OR 'implantable cardioverter defibrillator'/exp OR 'arrhythmic event*':ti,ab OR 'appropriate shock*':ti,ab OR prognos*:ti,ab) NOT ('case report'/exp OR 'editorial'/it OR 'note'/it)`,
      },
      {
        db: 'Cochrane CENTRAL',
        query: `(Brugada):ti,ab,kw AND (spontaneous OR "drug induced" OR ajmaline OR flecainide OR provocation):ti,ab,kw AND (arrhythmi* OR "sudden death" OR fibrillation OR defibrillator OR prognos*):ti,ab,kw`,
      },
      {
        db: 'Web of Science',
        query: `TS=(Brugada AND (spontaneous OR "drug-induced" OR ajmaline OR flecainide OR provocation) AND ("arrhythmic event*" OR "sudden cardiac death" OR "ventricular fibrillation" OR "appropriate shock*" OR prognos*))`,
      },
      {
        db: 'Scopus',
        query: `TITLE-ABS-KEY(Brugada AND (spontaneous OR "drug induced" OR ajmaline OR flecainide OR provocation) AND ("arrhythmic event*" OR "sudden cardiac death" OR "ventricular fibrillation" OR prognos*))`,
      },
      {
        db: 'Trial registries',
        query: `ClinicalTrials.gov + WHO ICTRP — condition: "Brugada syndrome" (screened for cohort/registry studies reporting arrhythmic outcomes)`,
      },
      {
        db: 'Supplementary',
        query: `Backward + forward citation chasing of all included studies and relevant reviews; hand-search of major EP journals; contact authors for unstratified outcome data`,
      },
    ],
    registration: 'PROSPERO — to register before screening (protocol drafted to PRISMA-P)',
    screenerUrl: 'https://vestrippn-srma-telemetry.vercel.app',
    outcomeLabel: 'Arrhythmic events',
    indexLabel: 'Spontaneous type-1',
    comparatorLabel: 'Drug-induced type-1',
    effect: 'OR',
    model: 'random',
    robDomains: ['Selection', 'Comparability', 'Outcome'],
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
    studies: [
      { id: 'st_nishizaki', author: 'Nishizaki', year: 2010, pmid: '20962431', design: 'prospective cohort', include: true },
      { id: 'st_mizusawa', author: 'Mizusawa', year: 2016, pmid: '27033637', design: 'cohort', include: true },
      { id: 'st_sieira', author: 'Sieira', year: 2017, pmid: '28479512', design: 'cohort', include: true },
      { id: 'st_michowitz', author: 'Michowitz', year: 2018, pmid: '29649615', design: 'multicentre registry', include: true },
      { id: 'st_camkiran', author: 'Camkiran', year: 2024, pmid: '38701276', design: 'cohort', include: true },
      { id: 'st_tuijnenburg', author: 'Tuijnenburg', year: 2025, pmid: '39491571', design: 'cohort', include: true },
      { id: 'st_monaco', author: 'Monaco', year: 2025, pmid: '40088219', design: 'cohort', include: true },
    ],
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
