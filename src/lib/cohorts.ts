import type { CohortReview, ProjectState, Study } from '../types'
import { newEvidenceId, normalizeDoi } from './evidence'

const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const analysisIncluded = (s: Pick<Study, 'id' | 'include' | 'cohortPrimaryId'>) => s.include && (!s.cohortPrimaryId || s.cohortPrimaryId === s.id)
export const enforceCohorts = (studies: Study[]) => studies.map((s) => s.cohortPrimaryId && s.cohortPrimaryId !== s.id && s.include ? { ...s, include: false } : s)
export const cohortFingerprint = (studies: Study[]) => JSON.stringify([...studies].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, author, year, pmid, doi, design, cohort, expTotal, ctrlTotal, n1, n2, note }) => ({ id, author, year, pmid, doi, design, cohort, expTotal, ctrlTotal, n1, n2, note })))

export function cohortReviewFingerprint(state: ProjectState, ids: string[]) {
  const pair = state.review.studies.filter((s) => ids.includes(s.id))
  const roots = new Set(pair.map((s) => s.cohortPrimaryId ?? s.id))
  const members = state.review.studies.filter((s) => ids.includes(s.id) || roots.has(s.cohortPrimaryId ?? s.id))
  return JSON.stringify({ metadata: cohortFingerprint(members), selections: members.map((s) => [s.id, s.include, s.cohortPrimaryId]), outcome: state.review.outcomeLabel, index: state.review.indexLabel, comparator: state.review.comparatorLabel, effect: state.review.effect })
}

function registrations(s: Study) {
  const text = `${s.cohort?.registration ?? ''} ${s.note ?? ''}`.toUpperCase()
  return new Set((text.match(/NCT\s*\d{8}|ISRCTN\s*\d{8}|ACTRN\s*\d{14}|UMIN\s*\d{9}|CHICTR[-A-Z]*\d{8,}|TCTR\s*\d{10,}/g) ?? []).map(norm))
}

export function overlapSignals(a: Study, b: Study): { signals: string[]; strength: 'strong' | 'possible' } | null {
  const signals: string[] = []
  let strong = false
  const flag = (text: string, major = false) => { signals.push(text); strong ||= major }
  if (a.pmid?.trim() && a.pmid.trim() === b.pmid?.trim()) flag('Same PMID — possible duplicate report', true)
  if (normalizeDoi(a.doi) && normalizeDoi(a.doi) === normalizeDoi(b.doi)) flag('Same DOI — possible duplicate report', true)
  const ra = registrations(a), rb = registrations(b)
  if ([...ra].some((r) => rb.has(r))) flag('Shared trial registration', true)
  if (norm(a.cohort?.name) && norm(a.cohort?.name) === norm(b.cohort?.name)) flag('Same named cohort', true)
  if (norm(a.cohort?.centers) && norm(a.cohort?.centers) === norm(b.cohort?.centers)) flag('Same recruitment centers')
  if (norm(a.cohort?.population) && norm(a.cohort?.population) === norm(b.cohort?.population)) flag('Same population description')
  const dates = [a.cohort?.recruitmentStart, a.cohort?.recruitmentEnd, b.cohort?.recruitmentStart, b.cohort?.recruitmentEnd]
  if (dates.every((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d))) {
    const [as, ae, bs, be] = dates as string[]
    if (as <= ae && bs <= be && as <= be && bs <= ae) flag('Recruitment periods overlap')
  }
  const author = (s: Study) => norm(s.author.split(/[,;]/)[0].replace(/\bet al\.?/i, ''))
  if (author(a) && author(a) === author(b)) flag('Shared first author')
  const size = (s: Study) => s.expTotal != null && s.ctrlTotal != null ? s.expTotal + s.ctrlTotal : s.n1 != null && s.n2 != null ? s.n1 + s.n2 : 0
  if (size(a) > 0 && size(a) === size(b)) flag(`Same extracted sample size (${size(a)})`)
  // Author/year or sample size alone is far too weak to establish linkage.
  return strong || signals.length >= 2 ? { signals, strength: strong ? 'strong' : 'possible' } : null
}

export function cohortCandidates(state: ProjectState) {
  const studies = state.review.studies
  const candidates: { a: Study; b: Study; signals: string[]; strength: 'strong' | 'possible'; fingerprint: string }[] = []
  for (let i = 0; i < studies.length; i++) for (let j = i + 1; j < studies.length; j++) {
    const a = studies[i], b = studies[j]
    if (a.cohortPrimaryId && a.cohortPrimaryId === b.cohortPrimaryId) continue
    const match = overlapSignals(a, b)
    if (!match) continue
    const fingerprint = cohortFingerprint([a, b])
    const last = [...(state.cohortReviews ?? [])].reverse().find((r) => r.studyIds.includes(a.id) && r.studyIds.includes(b.id))
    if (last?.decision === 'distinct' && last.fingerprint === fingerprint) continue
    candidates.push({ a, b, ...match, fingerprint })
  }
  return candidates.sort((a, b) => Number(b.strength === 'strong') - Number(a.strength === 'strong') || b.signals.length - a.signals.length)
}

export function reviewCohort(state: ProjectState, ids: string[], decision: 'linked' | 'distinct', primaryId: string | undefined, reason: string, expected: string): ProjectState {
  const pair = state.review.studies.filter((s) => ids.includes(s.id))
  if (new Set(ids).size < 2 || pair.length !== ids.length) throw new Error('Select two available reports.')
  if (cohortReviewFingerprint(state, ids) !== expected) throw new Error('Report details, cohort selection, or review outcome changed. Reopen this review before deciding.')
  if (!reason.trim()) throw new Error('Record the reason for your decision.')
  if (decision === 'distinct' && pair.some((s) => s.cohortPrimaryId && pair.some((p) => p.id !== s.id && p.cohortPrimaryId === s.cohortPrimaryId))) throw new Error('Unlink this group before reviewing its members as distinct cohorts.')
  const roots = new Set(pair.map((s) => s.cohortPrimaryId ?? s.id))
  const members = decision === 'linked' ? state.review.studies.filter((s) => ids.includes(s.id) || roots.has(s.cohortPrimaryId ?? s.id)) : pair
  if (decision === 'linked' && !members.some((s) => s.id === primaryId)) throw new Error('Choose the report to use for this outcome.')
  const memberIds = members.map((s) => s.id)
  const review: CohortReview = { id: newEvidenceId('cohort'), studyIds: memberIds, primaryId: decision === 'linked' ? primaryId : undefined, decision, reason: reason.trim(), fingerprint: cohortFingerprint(members), createdAt: Date.now() }
  return {
    ...state,
    review: { ...state.review, studies: state.review.studies.map((s) => decision === 'linked' && memberIds.includes(s.id) ? { ...s, cohortPrimaryId: primaryId, include: s.id === primaryId } : s) },
    cohortReviews: [...(state.cohortReviews ?? []), review],
  }
}

export function unlinkCohort(state: ProjectState, primaryId: string): ProjectState {
  const members = state.review.studies.filter((s) => s.cohortPrimaryId === primaryId)
  if (!members.length) return state
  return { ...state, review: { ...state.review, studies: state.review.studies.map((s) => s.cohortPrimaryId === primaryId ? { ...s, cohortPrimaryId: undefined } : s) }, cohortReviews: [...(state.cohortReviews ?? []), { id: newEvidenceId('cohort'), studyIds: members.map((s) => s.id), decision: 'reopened', reason: 'Link removed. Secondary reports remain excluded until individually re-enabled.', fingerprint: cohortFingerprint(members), createdAt: Date.now() }] }
}
