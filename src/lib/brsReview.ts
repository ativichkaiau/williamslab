import type { ProjectState } from '../types'
import type { ChatMessage } from './openai'

// Context-aware system prompt: a crisp, high-yield Brugada Syndrome
// reviewer that ties knowledge back to the user's own research.
export function systemPrompt(state: ProjectState): ChatMessage {
  const hyps = state.hypotheses.map((h) => `- ${h.label}: ${h.statement}`).join('\n')
  return {
    role: 'system',
    content: `You are a sharp cardiology / cardiac-electrophysiology tutor running a fast, high-yield knowledge review on Brugada Syndrome for a physician-researcher.

Their active research project is "${state.project.name}". Central hypothesis:
"${state.project.centralHypothesis}"

Working hypotheses on their board:
${hyps}

Rules of engagement:
- Be crisp and high-yield. Lead with the answer. Prefer tight bullet points and short bolded key terms over long prose.
- Use markdown: ## for section headings, **bold** for the terms worth memorising, and - bullets. Keep paragraphs to 1–2 sentences.
- Be mechanistically precise (SCN5A/Nav1.5, I_Na, RVOT conduction, depolarization vs repolarization hypotheses, type-1 coved ST, sodium-channel-blocker challenge, VF/SCD risk, quinidine, ICD).
- Whenever relevant, connect the topic back to their epigenetics angle (DNA methylation, histone marks, ncRNAs regulating sodium-channel loci) and to their listed hypotheses.
- Flag common exam traps and points of genuine controversy.
- Be accurate and current; if something is uncertain or debated, say so. Do not invent citations or specific statistics you are unsure of.
- This is for education and research framing, not individual patient care.`,
  }
}

export interface ReviewPreset {
  id: string
  label: string
  blurb: string
  prompt: string
}

export const PRESETS: ReviewPreset[] = [
  {
    id: 'overview',
    label: 'High-yield overview',
    blurb: 'The whole picture, fast',
    prompt: 'Give me a crisp, high-yield overview of Brugada Syndrome: definition, epidemiology, genetics, core mechanism, ECG, diagnosis, risk, and management. Structured with headings.',
  },
  {
    id: 'genetics',
    label: 'Genetics & ion channels',
    blurb: 'SCN5A, SCN10A, Nav1.5',
    prompt: 'Review the genetics and ion-channel basis of Brugada Syndrome: SCN5A / Nav1.5 loss-of-function, SCN10A and regulatory variation, the SCN5A–SCN10A locus, other minor genes, penetrance and the "only a minority explained by SCN5A" problem. Why does this open the door to epigenetic regulation?',
  },
  {
    id: 'mechanism',
    label: 'Pathophysiology',
    blurb: 'Depolarization vs repolarization',
    prompt: 'Explain the pathophysiology of Brugada Syndrome: reduced I_Na, conduction slowing in the RVOT, the depolarization vs repolarization hypotheses, and how these produce the type-1 ECG and re-entrant VF. Where does each hypothesis have support and weakness?',
  },
  {
    id: 'ecg',
    label: 'ECG & diagnosis',
    blurb: 'Type 1/2/3, drug challenge',
    prompt: 'Review the ECG patterns and diagnosis of Brugada Syndrome: type-1 coved vs type-2 saddleback, high right-precordial leads, dynamic patterns, the sodium-channel-blocker (ajmaline / flecainide) challenge, and current diagnostic criteria. Include the key exam traps.',
  },
  {
    id: 'risk',
    label: 'Risk & management',
    blurb: 'SCD risk, ICD, quinidine',
    prompt: 'Review risk stratification and management of Brugada Syndrome: spontaneous vs induced type-1, syncope, prior VF/SCD, EP study role, PR/QRS and conduction markers, the ICD decision, quinidine, and ablation. What predicts arrhythmic events?',
  },
  {
    id: 'epigenetics',
    label: 'Epigenetics angle',
    blurb: 'Ties to my project',
    prompt: 'Focus on the epigenetic regulation of sodium-channel genes in Brugada Syndrome — DNA methylation at SCN5A/SCN10A promoters and enhancers, histone marks (H3K27me3, H3K4me3, H3K27ac), chromatin accessibility, 3D looping, and ncRNAs/miRNAs targeting Nav1.5. What is established, what is speculative, and how does it map onto my three hypotheses?',
  },
  {
    id: 'traps',
    label: 'Exam traps',
    blurb: 'High-yield pitfalls',
    prompt: 'List the highest-yield exam traps and common misconceptions about Brugada Syndrome — diagnosis, genetics, mechanism, and management — as a tight bulleted "watch out for" list.',
  },
  {
    id: 'quiz',
    label: 'Quiz me',
    blurb: '8 questions + answers',
    prompt: 'Quiz me on Brugada Syndrome: 8 progressively harder questions spanning genetics, mechanism, ECG, and management, with a bolded correct answer and a one-line explanation under each. Include at least two that touch the epigenetics of sodium-channel regulation.',
  },
]
