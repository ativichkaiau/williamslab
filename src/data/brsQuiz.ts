// Self-check quiz for the BrS Theory page. Each question links back to the
// section it is drawn from so a wrong answer routes the reader to the source.

export interface QuizQ {
  id: string
  sectionId: string // TheorySection.id to jump to on review
  q: string
  options: string[]
  answer: number // index into options
  explain: string
}

export const QUIZ: QuizQ[] = [
  {
    id: 'q-core',
    sectionId: 'overview',
    q: 'At its core, Brugada Syndrome is best described as a disorder of which current?',
    options: ['Increased late sodium current', 'Reduced inward sodium current (I_Na)', 'Increased L-type calcium current', 'Reduced rapid delayed-rectifier K⁺ current'],
    answer: 1,
    explain: 'BrS is fundamentally a loss-of-function of the cardiac sodium current (↓I_Na): less inward Na⁺ → slowed conduction and/or heterogeneous repolarization.',
  },
  {
    id: 'q-ecg',
    sectionId: 'ecg',
    q: 'Which ECG morphology is diagnostic of Brugada Syndrome without provocation?',
    options: ['Saddleback type-2', 'Low saddleback type-3', 'Coved type-1', 'Any right-precordial ST elevation'],
    answer: 2,
    explain: 'Only the coved type-1 pattern (≥2 mm J-point elevation with a descending ST and negative T in V1–V2) is diagnostic. Type-2/3 require conversion on provocation.',
  },
  {
    id: 'q-timing',
    sectionId: 'overview',
    q: 'Arrhythmic events in BrS characteristically occur:',
    options: ['During peak exercise', 'At rest or during sleep, at low heart rates', 'Only during fever, never otherwise', 'Immediately after standing'],
    answer: 1,
    explain: 'Events are classically nocturnal / at rest at low heart rates, modulated by vagal tone and fever — a signature of the reduced-I_Na substrate.',
  },
  {
    id: 'q-gene',
    sectionId: 'genetics',
    q: 'Approximately what fraction of BrS cases is explained by SCN5A mutations?',
    options: ['~5%', '~20–30%', '~60%', '>90%'],
    answer: 1,
    explain: 'SCN5A accounts for only ~20–30% of cases. The large unexplained majority — enriched for regulatory/common variation — is the doorway to epigenetics.',
  },
  {
    id: 'q-firstgene',
    sectionId: 'genetics',
    q: 'Which gene was the first identified cause of Brugada Syndrome (1998)?',
    options: ['CACNA1C', 'SCN10A', 'SCN5A', 'KCNH2'],
    answer: 2,
    explain: 'SCN5A, encoding the Na_v1.5 α-subunit, was identified by Chen et al. (Nature 1998) as the first BrS gene.',
  },
  {
    id: 'q-ito',
    sectionId: 'cellular',
    q: 'The transient outward current (I_to) that shapes the phase-1 notch is largest in:',
    options: ['LV endocardium', 'RV epicardium', 'The His bundle', 'Atrial myocardium'],
    answer: 1,
    explain: 'I_to is most prominent in RV epicardium. A strong I_to notch, when unopposed by reduced I_Na, underlies loss of the action-potential dome and phase-2 re-entry.',
  },
  {
    id: 'q-mech',
    sectionId: 'mechanism',
    q: 'The two leading mechanistic hypotheses for the BrS substrate are:',
    options: ['Fibrosis vs ischemia', 'Repolarization vs depolarization', 'Automaticity vs triggered activity', 'Reentry vs afterdepolarization only'],
    answer: 1,
    explain: 'The repolarization hypothesis (transmural I_to gradient → phase-2 re-entry) and the depolarization hypothesis (RVOT conduction delay) are the two dominant, non-exclusive models.',
  },
  {
    id: 'q-prov',
    sectionId: 'provocation',
    q: 'Which drug class is used to provoke a type-1 pattern in suspected BrS?',
    options: ['Beta-agonists', 'Sodium-channel blockers (e.g. ajmaline, flecainide)', 'Calcium-channel blockers', 'Potassium-channel openers'],
    answer: 1,
    explain: 'Sodium-channel blockers (ajmaline, flecainide, procainamide, pilsicainide) unmask the type-1 pattern by further reducing I_Na.',
  },
  {
    id: 'q-fever',
    sectionId: 'presentation',
    q: 'Fever in a BrS patient typically:',
    options: ['Is protective', 'Can unmask the type-1 ECG and precipitate arrhythmia', 'Has no effect', 'Only matters in children with SCN10A variants'],
    answer: 1,
    explain: 'Many BrS SCN5A variants are temperature-sensitive; fever can unmask the type-1 pattern and trigger events, so fever is treated promptly.',
  },
  {
    id: 'q-risk',
    sectionId: 'risk',
    q: 'Which is the strongest established risk marker for future arrhythmic events?',
    options: ['Family history of BrS alone', 'A spontaneous (vs drug-induced) type-1 ECG with prior syncope/arrest', 'Male sex alone', 'A saddleback type-2 pattern'],
    answer: 1,
    explain: 'Spontaneous type-1 ECG, especially with prior syncope or aborted arrest, carries the highest risk. Drug-induced-only patterns in asymptomatic patients are lower risk.',
  },
  {
    id: 'q-icd',
    sectionId: 'management',
    q: 'The only therapy with proven mortality benefit in high-risk BrS is:',
    options: ['Beta-blockers', 'The implantable cardioverter-defibrillator (ICD)', 'Amiodarone', 'Permanent pacing'],
    answer: 1,
    explain: 'The ICD is the mainstay for high-risk patients. Quinidine (I_to blockade) and epicardial ablation are adjuncts for recurrent VF / storms.',
  },
  {
    id: 'q-epi',
    sectionId: 'epigenetics',
    q: 'Which epigenetic mechanism is a plausible route to reduced Na_v1.5 dosage?',
    options: ['Telomere shortening', 'Promoter/enhancer DNA methylation and repressive histone marks', 'Mitochondrial heteroplasmy', 'Codon bias'],
    answer: 1,
    explain: 'Promoter/enhancer methylation, repressive histone remodeling (e.g. H3K27me3), altered enhancer–promoter looping and ncRNAs can all lower Na_v1.5 expression without changing the coding sequence — the project’s central axis.',
  },
]
