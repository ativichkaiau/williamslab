import type { EvidenceClaim, EvidencePassage, EvidenceWorkspace, ProjectState } from '../types'

export const newEvidenceId = (prefix: string) => `${prefix}_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 12)}`
export const normalizeDoi = (doi?: string) => (doi ?? '').trim().replace(/^doi:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase()
export const validDoi = (doi: string) => /^10\.\d{4,9}\/\S+$/i.test(normalizeDoi(doi)) && !/[,&?#]/.test(normalizeDoi(doi))
export const claimText = (text: string) => text.replace(/\s+/g, ' ').trim()

export function evidenceOf(state: ProjectState): EvidenceWorkspace {
  return { passages: [], claims: [], revisions: [], assessments: [], notices: [], autoDraft: true, ...state.evidence }
}

export function sourceVersion(state: ProjectState, passage: EvidencePassage): string {
  const notices = evidenceOf(state).notices.find((n) => n.doi === normalizeDoi(passage.doi))?.notices ?? []
  // Exact snapshots, not a lossy hash. A new notice invalidates a queued revision;
  // routine checks of unchanged metadata do not.
  return JSON.stringify({ passage, notices: [...notices].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) })
}

export function unreviewedPassages(state: ProjectState): EvidencePassage[] {
  const e = evidenceOf(state)
  return e.passages.filter((p) => !e.assessments.some((a) => a.sourceVersions[p.id] === sourceVersion(state, p)))
}

export function findClaim(claims: EvidenceClaim[], document: EvidenceClaim['document'], sectionId: string, text: string) {
  return claims.find((c) => c.document === document && c.sectionId === sectionId && c.text === claimText(text))
}

export function savePassage(state: ProjectState, passage: EvidencePassage): ProjectState {
  if (!passage.title.trim() || !passage.referenceId || !passage.locator.trim() || !passage.text.trim()) throw new Error('Add a reference, passage, and source location.')
  if (passage.text.length > 12000) throw new Error('Save an excerpt of up to 12,000 characters, rather than the full article.')
  if (passage.doi && !validDoi(passage.doi)) throw new Error('Enter a DOI such as 10.1234/example, or leave it blank.')
  const e = evidenceOf(state)
  if (e.passages.some((p) => p.id === passage.id)) throw new Error('Passages are immutable. Save a new passage to correct the source record.')
  if (e.passages.some((p) => p.referenceId === passage.referenceId && p.text === passage.text && p.locator === passage.locator)) throw new Error('This passage is already saved.')
  return { ...state, evidence: { ...e, passages: [...e.passages, { ...passage, doi: normalizeDoi(passage.doi) || undefined }] } }
}

export function saveClaim(state: ProjectState, claim: EvidenceClaim): ProjectState {
  const e = evidenceOf(state)
  if (!claim.text.trim() || !claim.sectionId) throw new Error('Select a claim in Theory or the manuscript.')
  if (claim.links.some((l) => !e.passages.some((p) => p.id === l.passageId) || !['supports', 'conflicts', 'context'].includes(l.stance))) throw new Error('A linked passage is no longer available. Reopen the evidence panel.')
  const existing = findClaim(e.claims, claim.document, claim.sectionId, claim.text)
  const saved = { ...claim, id: existing?.id ?? claim.id, text: claimText(claim.text) }
  return { ...state, evidence: { ...e, claims: [...e.claims.filter((c) => c.id !== saved.id), saved] } }
}

// Append only anchors still present in this export. Changed prose cannot silently
// inherit old evidence, including when a pooled estimate changes.
export function evidenceAppendix(state: ProjectState, document: EvidenceClaim['document'], visibleText: string): string {
  const e = evidenceOf(state)
  const visible = new Set(visibleText.split('\n').filter((line) => !/^\s*#/.test(line)).flatMap((line) => line.trim().startsWith('|') ? line.replace(/^\s*\||\|\s*$/g, '').split('|') : [line.replace(/^\s*(?:[-*]|\d+\.)\s+(?:\[[ x]\]\s+)?/, '')]).map((line) => claimText(line.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g, '$1$2$3'))))
  const claims = e.claims.filter((c) => c.document === document && (document !== 'manuscript' || c.sectionId === 'narrative') && c.links.length && visible.has(c.text))
  if (!claims.length) return ''
  return '\n\n## Evidence trace\n\n' + claims.map((c) => `Claim: ${c.text}\n\n` + c.links.map((l) => {
    const p = e.passages.find((s) => s.id === l.passageId)
    if (!p) return `- ${l.stance}: Source passage unavailable.`
    const notices = e.notices.find((n) => n.doi === normalizeDoi(p.doi))?.notices ?? []
    return `- ${l.stance}: ${p.title} (${p.locator}${p.doi ? '; doi:' + p.doi : ''}${p.pmid ? '; PMID ' + p.pmid : ''}). ${l.reason}\n  Exact passage: ${p.text}\n  Study design: ${p.design || 'Not recorded'}. Limitations: ${p.limitations || 'Not recorded'}.${notices.length ? '\n  Publication notices: ' + notices.map((n) => n.type).join(', ') + '.' : ''}`
  }).join('\n\n')).join('\n\n')
}
