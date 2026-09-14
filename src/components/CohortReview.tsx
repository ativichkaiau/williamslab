import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { cohortCandidates, cohortReviewFingerprint, reviewCohort, unlinkCohort } from '../lib/cohorts'
import type { CohortProfile, Study } from '../types'
import { Field, Modal } from './Modal'

export function CohortFields({ value, onChange }: { value: CohortProfile; onChange: (value: CohortProfile) => void }) {
  const field = (key: keyof CohortProfile, label: string, placeholder?: string, type = 'text') => <Field label={label}><input className="input" type={type} value={value[key] ?? ''} placeholder={placeholder} onChange={(e) => onChange({ ...value, [key]: e.target.value || undefined })} /></Field>
  return <details className="cohort-fields" open={!!Object.values(value).filter(Boolean).length}><summary>Study identity &amp; cohort details</summary><p className="small muted">Used to flag possible overlapping reports for your review.</p><div className="form-row">{field('registration', 'Trial registration', 'NCT…, ISRCTN…')}{field('name', 'Cohort name', 'Registry or cohort name')}</div>{field('centers', 'Recruitment centers', 'Institutions / sites')}{field('population', 'Population', 'Eligibility and setting')}<div className="form-row">{field('recruitmentStart', 'Recruitment start', '', 'date')}{field('recruitmentEnd', 'Recruitment end', '', 'date')}</div></details>
}

const label = (s: Study) => `${s.author} ${s.year}`

export function CohortReviewPanel({ onEdit }: { onEdit: (s: Study) => void }) {
  const { state, updateResearch } = useStore()
  const candidates = useMemo(() => cohortCandidates(state), [state.review.studies, state.cohortReviews])
  const [review, setReview] = useState<{ ids: string[]; fingerprint: string; signals: string[] } | null>(null)
  const [primaryId, setPrimaryId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [limit, setLimit] = useState(8)
  const groups = [...new Set(state.review.studies.map((s) => s.cohortPrimaryId).filter((id): id is string => !!id))].map((id) => ({ id, members: state.review.studies.filter((s) => s.cohortPrimaryId === id) }))
  function open(ids: string[], signals: string[] = []) {
    setReview({ ids, signals, fingerprint: cohortReviewFingerprint(state, ids) }); setPrimaryId(''); setReason(''); setError('')
  }
  const pair = review ? state.review.studies.filter((s) => review.ids.includes(s.id)) : []
  const roots = new Set(pair.map((s) => s.cohortPrimaryId ?? s.id))
  const affected = state.review.studies.filter((s) => pair.some((p) => p.id === s.id) || roots.has(s.cohortPrimaryId ?? s.id))
  function decide(decision: 'linked' | 'distinct') {
    if (!review) return
    try {
      updateResearch(state.project.id, (p) => reviewCohort(p, review.ids, decision, primaryId || undefined, reason, review.fingerprint), decision === 'linked' ? 'Linked overlapping reports and selected the report for pooling' : 'Reviewed reports as distinct cohorts')
      setReview(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the cohort review.') }
  }
  return <section className="card cohort-review">
    <div className="wrap-gap"><h2>Study &amp; cohort links</h2><span className="pill">{candidates.length} possible overlaps</span></div>
    <p className="small">Compare trial IDs, recruitment dates, sites and sample sizes. Flags are candidates for review. Confirming overlap retains all reports and uses your selected report for this review’s current outcome.</p>
    {!candidates.length && <p className="small muted">No unreviewed matches found. Missing study details can hide overlaps; add cohort metadata or review a pair manually.</p>}
    {candidates.slice(0, limit).map((c) => <article className="cohort-candidate" key={`${c.a.id}-${c.b.id}`}><div><b>{label(c.a)} ↔ {label(c.b)}</b><p className="small">{c.signals.join(' · ')}</p><span className="small muted">{c.strength === 'strong' ? 'Shared identifier' : 'Multiple clues'} · needs review</span></div><button className="btn ghost sm" onClick={() => open([c.a.id, c.b.id], c.signals)}>Review pair</button></article>)}
    {candidates.length > limit && <button className="btn ghost sm" onClick={() => setLimit(limit + 20)}>Show more matches</button>}
    <details className="cohort-manual"><summary>Review any two reports</summary><div className="form-row"><Field label="First report"><select className="select" value={first} onChange={(ev) => setFirst(ev.target.value)}><option value="">Choose…</option>{state.review.studies.map((s) => <option key={s.id} value={s.id}>{label(s)} · {s.pmid || s.id}</option>)}</select></Field><Field label="Second report"><select className="select" value={second} onChange={(ev) => setSecond(ev.target.value)}><option value="">Choose…</option>{state.review.studies.filter((s) => s.id !== first).map((s) => <option key={s.id} value={s.id}>{label(s)} · {s.pmid || s.id}</option>)}</select></Field></div><button className="btn ghost sm" disabled={!first || !second || first === second} onClick={() => open([first, second])}>Compare reports</button></details>
    {!!groups.length && <div className="cohort-groups"><h3>Reviewed groups</h3>{groups.map((g) => <article className="cohort-candidate" key={g.id}><div><b>{g.members.length} linked reports</b><p className="small">Selected for {state.review.outcomeLabel}: {g.members.find((s) => s.id === g.id) ? label(g.members.find((s) => s.id === g.id)!) : 'Selected report removed — choose another before pooling'}</p><p className="small muted">{g.members.map(label).join(' · ')}</p></div><div className="wrap-gap"><button className="btn ghost sm" disabled={g.members.length < 2} onClick={() => open(g.members.map((s) => s.id), ['Previously linked reports'])}>Change selection</button><button className="btn ghost sm" onClick={() => updateResearch(state.project.id, (p) => unlinkCohort(p, g.id), 'Reopened a cohort link; inclusion remains unchanged')}>Unlink</button></div></article>)}<p className="small muted">Unlinking keeps secondary reports excluded until you re-enable them. Revisit the selected report if the outcome or follow-up changes.</p></div>}
    {!!state.cohortReviews?.length && <details className="cohort-history"><summary>Review history</summary>{[...state.cohortReviews].reverse().map((r) => <p className="small" key={r.id}><b>{r.decision}</b> · {r.studyIds.map((id) => state.review.studies.find((s) => s.id === id)).map((s) => s ? label(s) : 'Removed report').join(' / ')} · {new Date(r.createdAt).toLocaleString()}<br />{r.reason}</p>)}</details>}
    <p className="small muted">Method: <a href="https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04#section-4-6-2" target="_blank" rel="noreferrer">Cochrane guidance on multiple reports of a study ↗</a></p>
    {review && <Modal title="Review possible cohort overlap" onClose={() => setReview(null)} wide>
      <p>{review.signals.join(' · ') || 'Manual comparison'}</p>
      <div className="cohort-comparison">{pair.map((s) => <article className="card" key={s.id}><h4>{label(s)}</h4><dl className="evidence-facts"><div><dt>Identifiers</dt><dd>{[s.pmid ? 'PMID ' + s.pmid : '', s.doi].filter(Boolean).join(' · ') || 'Not recorded'}</dd></div><div><dt>Registration</dt><dd>{s.cohort?.registration || 'Not recorded'}</dd></div><div><dt>Cohort / centers</dt><dd>{[s.cohort?.name, s.cohort?.centers].filter(Boolean).join(' · ') || 'Not recorded'}</dd></div><div><dt>Recruitment</dt><dd>{s.cohort?.recruitmentStart || '?'} → {s.cohort?.recruitmentEnd || '?'}</dd></div><div><dt>Design / population</dt><dd>{[s.design, s.cohort?.population].filter(Boolean).join(' · ') || 'Not recorded'}</dd></div><div><dt>Extracted sample</dt><dd>{s.expTotal != null && s.ctrlTotal != null ? s.expTotal + s.ctrlTotal : s.n1 != null && s.n2 != null ? s.n1 + s.n2 : 'Not recorded'}</dd></div></dl>{s.note && <p className="small">{s.note}</p>}<button className="btn ghost sm" onClick={() => { setReview(null); onEdit(s) }}>Edit report details</button></article>)}</div>
      <p className="small">Check the original reports. Shared identifiers may cover substudies or different populations. Select one report only when participants overlap for <b>{state.review.outcomeLabel}</b> and the comparison / follow-up you are synthesizing.</p>
      <Field label="Report to use in this pooled analysis"><select className="select" value={primaryId} onChange={(ev) => setPrimaryId(ev.target.value)}><option value="">Choose if confirming overlap…</option>{affected.map((s) => <option key={s.id} value={s.id}>{label(s)} · {s.pmid || s.id}</option>)}</select></Field>
      {!!primaryId && <p className="evidence-warning">Confirming will include the selected report and exclude {affected.length - 1} linked report{affected.length === 2 ? '' : 's'} from the current pooled analysis. Their data remain available.</p>}
      <Field label="Decision reason"><textarea className="textarea" rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Describe the participant overlap or evidence that these are distinct cohorts; record why the selected report fits this outcome." /></Field>
      {error && <p className="evidence-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="btn ghost" onClick={() => setReview(null)}>Cancel</button><button className="btn ghost" disabled={!reason.trim() || pair.some((s) => s.cohortPrimaryId && s.cohortPrimaryId === pair.find((p) => p.id !== s.id)?.cohortPrimaryId)} onClick={() => decide('distinct')}>Distinct cohorts</button><button className="btn primary" disabled={!primaryId || !reason.trim()} onClick={() => decide('linked')}>Confirm overlap &amp; selection</button></div>
    </Modal>}
  </section>
}
