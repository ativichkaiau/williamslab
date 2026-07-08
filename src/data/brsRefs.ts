// Citations for the BrS Theory sections. Keyed by TheorySection.id.
//
// Design note: we deliberately anchor most references to a *PubMed query*
// rather than a hardcoded PMID. A query is self-verifying (it lands the reader
// on the right literature and cannot silently point at the wrong paper) and it
// doubles as the "refresh milestones" feed. Raw PMIDs are used only for a
// couple of landmark papers whose identifiers are unambiguous.

export interface Citation {
  cite: string // human-readable reference
  pmid?: string // when we can point at one specific paper with confidence
  query?: string // otherwise, a curated PubMed query that lands on it
}

export interface SectionRefs {
  query: string // topic query used by "latest on PubMed"
  refs: Citation[]
}

const pm = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
const pmq = (q: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}&sort=date`
export const citationUrl = (c: Citation) => (c.pmid ? pm(c.pmid) : pmq(c.query ?? c.cite))

export const REFS: Record<string, SectionRefs> = {
  overview: {
    query: 'Brugada syndrome review',
    refs: [
      { cite: 'Brugada P & Brugada J. Right bundle branch block, ST elevation and sudden death. J Am Coll Cardiol 1992 — original description', pmid: '1309182' },
      { cite: 'Antzelevitch C et al. Brugada syndrome: report of the second consensus conference. Circulation 2005', query: 'Brugada syndrome second consensus conference Antzelevitch' },
    ],
  },
  history: {
    query: 'Brugada syndrome history SUNDS',
    refs: [
      { cite: 'Brugada P & Brugada J. J Am Coll Cardiol 1992 — the naming report', pmid: '1309182' },
      { cite: 'Nademanee K et al. Sudden unexplained nocturnal death syndrome (SUNDS) in Thailand', query: 'Nademanee sudden unexplained nocturnal death syndrome Thailand Brugada' },
    ],
  },
  epidemiology: {
    query: 'Brugada syndrome prevalence epidemiology',
    refs: [
      { cite: 'Prevalence and geographic distribution of the Brugada ECG pattern', query: 'Brugada syndrome prevalence epidemiology Southeast Asia' },
    ],
  },
  genetics: {
    query: 'Brugada syndrome genetics SCN5A common variants',
    refs: [
      { cite: 'Chen Q et al. Genetic basis and molecular mechanism for idiopathic VF (SCN5A). Nature 1998', pmid: '9521325' },
      { cite: 'Bezzina CR et al. Common variants at SCN5A–SCN10A and HEY2 associate with Brugada syndrome. Nat Genet 2013', query: 'Bezzina 2013 common variants SCN5A SCN10A HEY2 Brugada' },
      { cite: 'ClinGen / reappraisal of Brugada syndrome gene–disease validity', query: 'Brugada syndrome gene curation ClinGen validity SCN5A' },
    ],
  },
  cellular: {
    query: 'Brugada syndrome Ito epicardium action potential',
    refs: [
      { cite: 'Yan GX & Antzelevitch C. Cellular basis for the Brugada ECG (I_to, epicardial notch)', query: 'Yan Antzelevitch cellular basis Brugada ECG Ito epicardium' },
    ],
  },
  mechanism: {
    query: 'Brugada syndrome depolarization repolarization mechanism',
    refs: [
      { cite: 'Repolarization vs depolarization hypotheses of the Brugada substrate', query: 'Brugada syndrome depolarization repolarization hypothesis mechanism' },
      { cite: 'Nademanee K et al. Epicardial RVOT substrate and ablation. Circulation 2011', query: 'Nademanee epicardial substrate right ventricular outflow tract Brugada ablation' },
    ],
  },
  ecg: {
    query: 'Brugada type 1 ECG criteria',
    refs: [
      { cite: 'Shanghai score / updated diagnostic criteria for Brugada syndrome', query: 'Brugada syndrome Shanghai score diagnostic criteria' },
    ],
  },
  provocation: {
    query: 'ajmaline flecainide provocation Brugada',
    refs: [
      { cite: 'Sodium-channel blocker provocation testing (ajmaline / flecainide)', query: 'ajmaline provocation test Brugada syndrome sensitivity' },
    ],
  },
  diagnosis: {
    query: 'Brugada syndrome diagnosis guideline',
    refs: [
      { cite: 'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and SCD', query: '2022 ESC guidelines ventricular arrhythmias sudden cardiac death Brugada' },
    ],
  },
  risk: {
    query: 'Brugada syndrome risk stratification',
    refs: [
      { cite: 'Risk stratification: spontaneous type-1, syncope, EPS debate', query: 'Brugada syndrome risk stratification spontaneous type 1 syncope' },
      { cite: 'Probst V et al. FINGER Brugada registry — outcomes', query: 'FINGER Brugada syndrome registry Probst outcome' },
    ],
  },
  management: {
    query: 'Brugada syndrome management ICD quinidine',
    refs: [
      { cite: 'Quinidine and catheter ablation for recurrent VF in Brugada syndrome', query: 'quinidine catheter ablation Brugada syndrome ventricular fibrillation' },
    ],
  },
  epigenetics: {
    query: 'DNA methylation SCN5A cardiac arrhythmia epigenetics',
    refs: [
      { cite: 'DNA methylation and SCN5A / Na_v1.5 regulation in the heart', query: 'DNA methylation SCN5A Nav1.5 cardiac regulation' },
      { cite: 'Enhancer–promoter regulation at the SCN5A–SCN10A locus', query: 'SCN5A SCN10A enhancer regulatory variant cardiac conduction' },
      { cite: 'Non-coding RNAs regulating cardiac sodium channel expression', query: 'microRNA long noncoding RNA SCN5A sodium channel cardiac' },
    ],
  },
  biomarkers: {
    query: 'Brugada syndrome biomarker epigenetic',
    refs: [
      { cite: 'Circulating and epigenetic biomarkers in inherited arrhythmia', query: 'circulating microRNA epigenetic biomarker inherited arrhythmia Brugada' },
    ],
  },
  milestones: {
    query: 'Brugada syndrome',
    refs: [
      { cite: 'Brugada P & Brugada J. J Am Coll Cardiol 1992', pmid: '1309182' },
      { cite: 'Chen Q et al. Nature 1998 — SCN5A', pmid: '9521325' },
    ],
  },
}
