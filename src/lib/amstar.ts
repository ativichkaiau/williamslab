// AMSTAR-2 — methodological-quality appraisal of the review itself.
// 16 items; 7 are "critical" domains. The overall confidence rating follows
// the AMSTAR-2 algorithm (Shea et al., BMJ 2017).

export type AmstarAnswer = 'yes' | 'partial' | 'no'

export interface AmstarItem {
  id: string
  n: number
  text: string
  critical: boolean
}

export const AMSTAR_ITEMS: AmstarItem[] = [
  { id: 'pico', n: 1, text: 'Research question & inclusion criteria include the PICO components', critical: false },
  { id: 'protocol', n: 2, text: 'Protocol registered before the review, with any deviations justified', critical: true },
  { id: 'designJustify', n: 3, text: 'Study designs for inclusion explained and justified', critical: false },
  { id: 'search', n: 4, text: 'Comprehensive search: ≥2 databases, keywords/strategy, no undue limits', critical: true },
  { id: 'dupSelect', n: 5, text: 'Study selection performed in duplicate', critical: false },
  { id: 'dupExtract', n: 6, text: 'Data extraction performed in duplicate', critical: false },
  { id: 'excluded', n: 7, text: 'List of excluded (full-text) studies with justification', critical: true },
  { id: 'describe', n: 8, text: 'Included studies described in adequate detail (PICO, design)', critical: false },
  { id: 'rob', n: 9, text: 'Satisfactory technique to assess risk of bias in included studies', critical: true },
  { id: 'funding', n: 10, text: 'Funding sources of the included studies reported', critical: false },
  { id: 'metaMethods', n: 11, text: 'Appropriate statistical methods used to combine results', critical: true },
  { id: 'robImpact', n: 12, text: 'Impact of risk of bias on the pooled estimate assessed', critical: false },
  { id: 'robInterpret', n: 13, text: 'Risk of bias accounted for when interpreting results', critical: true },
  { id: 'heterogeneity', n: 14, text: 'Heterogeneity investigated and discussed', critical: false },
  { id: 'pubBias', n: 15, text: 'Publication bias investigated and its likely impact discussed', critical: true },
  { id: 'coi', n: 16, text: 'Conflicts of interest / funding of the review itself reported', critical: false },
]

export type AmstarRating = 'High' | 'Moderate' | 'Low' | 'Critically low'

export function amstarRating(answers: Record<string, AmstarAnswer> = {}): {
  rating: AmstarRating
  critical: number
  nonCritical: number
  answered: number
} {
  let critical = 0
  let nonCritical = 0
  let answered = 0
  for (const it of AMSTAR_ITEMS) {
    const a = answers[it.id]
    if (a) answered++
    const met = a === 'yes'
    if (!met) {
      if (a === 'no' && it.critical) critical++
      else nonCritical++ // partial (any) or 'no'/unanswered on a non-critical item
    }
  }
  const rating: AmstarRating = critical > 1 ? 'Critically low' : critical === 1 ? 'Low' : nonCritical <= 1 ? 'High' : 'Moderate'
  return { rating, critical, nonCritical, answered }
}

export const AMSTAR_COLOR: Record<AmstarRating, string> = {
  High: 'var(--green)',
  Moderate: 'var(--blue)',
  Low: 'var(--amber)',
  'Critically low': 'var(--red)',
}
