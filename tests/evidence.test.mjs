import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { webcrypto } from 'node:crypto'
import { createServer } from 'vite'
import { createServer as createHttpServer } from 'node:http'

globalThis.crypto ??= webcrypto
const vite = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' })
after(() => vite.close())
const { blankProject, seed } = await vite.ssrLoadModule('/src/data/seed.ts')
const ev = await vite.ssrLoadModule('/src/lib/evidence.ts')
const living = await vite.ssrLoadModule('/src/lib/livingTheory.ts')
const cohorts = await vite.ssrLoadModule('/src/lib/cohorts.ts')
const notices = await vite.ssrLoadModule('/src/lib/publicationNotices.ts')
const meta = await vite.ssrLoadModule('/src/lib/metaAnalysis.ts')
const { parseStudies } = await vite.ssrLoadModule('/src/lib/importStudies.ts')
const { theoryChunks } = await vite.ssrLoadModule('/src/lib/theoryRag.ts')

function fixture() {
  const state = blankProject('sleep', 'Sleep and memory', 'SLEEP')
  state.theory = { title: 'Sleep', summary: 'Draft', generatedAt: 1, model: 'test', sources: [], sections: [{ id: 'mechanisms', title: 'Memory mechanisms', group: 'Evidence', body: 'The role of sleep needs verification.' }] }
  state.papers = [{ id: 'paper', title: 'Memory cohort', doi: '10.1234/example' }]
  return ev.savePassage(state, { id: 'passage', referenceId: 'paper', title: 'Memory cohort', doi: '10.1234/example', text: 'Retention improved by 5 points.\n  Confounding cannot be excluded.', locator: 'Page 4, Results', design: 'Observational cohort', limitations: 'Residual confounding', origin: 'paste', createdAt: 1 })
}
const response = () => ({ summary: 'The new passage qualifies the mechanism chapter.', revisions: [{ sectionId: 'mechanisms', reason: 'An observational result adds context, with residual confounding.', paragraphs: [{ text: 'The cohort reported improved retention, but causality remains uncertain.', links: [{ passageId: 'passage', stance: 'supports', reason: 'The Results passage reports retention and its limitation.' }] }] }] })
const batchFor = (s) => living.parseRevisions(JSON.stringify(response()), s, 'test-model')

test('source passages remain exact and immutable, with bounded storage', () => {
  const s = fixture()
  const p = ev.evidenceOf(s).passages[0]
  assert.equal(p.text, 'Retention improved by 5 points.\n  Confounding cannot be excluded.')
  assert.throws(() => ev.savePassage(s, { ...p, text: 'A different quotation' }), /immutable/)
  assert.throws(() => ev.savePassage(s, { ...p, id: 'x' }), /already saved/)
  assert.throws(() => ev.savePassage(s, { ...p, id: 'x', text: 'x'.repeat(12001) }), /12,000/)
  assert.throws(() => ev.savePassage(s, { ...p, id: 'x', doi: 'javascript:alert(1)' }), /DOI/)
})

test('claims support conflicting evidence and only exact current prose appears in exports', () => {
  let s = fixture()
  s = ev.savePassage(s, { ...ev.evidenceOf(s).passages[0], id: 'conflict', referenceId: 'other', text: 'No difference was detected.' })
  const c = { id: 'claim', document: 'manuscript', sectionId: 'narrative', text: 'Sleep improves recall.', links: [{ passageId: 'passage', stance: 'supports', reason: 'Reported improvement' }, { passageId: 'conflict', stance: 'conflicts', reason: 'No difference' }], updatedAt: 1 }
  s = ev.saveClaim(s, c)
  assert.equal(ev.findClaim(s.evidence.claims, 'manuscript', 'narrative', 'Sleep improves recall.')?.links.length, 2)
  assert.equal(ev.findClaim(s.evidence.claims, 'theory', 'narrative', c.text), undefined)
  assert.equal(ev.findClaim(s.evidence.claims, 'manuscript', 'narrative', 'Sleep improves recall. Or does it?'), undefined)
  const appendix = ev.evidenceAppendix(s, 'manuscript', '**Sleep** improves recall.')
  assert.match(appendix, /conflicts: Memory cohort/)
  assert.ok(appendix.includes(s.evidence.passages[0].text))
  assert.equal(ev.evidenceAppendix(s, 'manuscript', 'Sleep improves recall. Or does it?'), '')
  assert.throws(() => ev.saveClaim(s, { ...c, links: [{ passageId: 'invented', stance: 'supports', reason: '' }] }), /no longer available/)
})

test('proposals require known chapters, supplied evidence, complete structured output and traceable paragraphs', () => {
  const s = fixture()
  for (const raw of ['null', '[]', '{', '{}']) assert.throws(() => living.parseRevisions(raw, s, 'test'))
  const unknown = response(); unknown.revisions[0].paragraphs[0].links[0].passageId = 'hallucinated'
  assert.throws(() => living.parseRevisions(JSON.stringify(unknown), s, 'test'), /not supplied/)
  const wrong = response(); wrong.revisions[0].sectionId = 'another-project'
  assert.throws(() => living.parseRevisions(JSON.stringify(wrong), s, 'test'), /unknown/)
  const unlinked = response(); unlinked.revisions[0].paragraphs[0].links = []
  assert.throws(() => living.parseRevisions(JSON.stringify(unlinked), s, 'test'), /traceable/)
  const malformed = response(); malformed.revisions[0].paragraphs[0].text = 'first\nsecond'
  assert.throws(() => living.parseRevisions(JSON.stringify(malformed), s, 'test'), /paragraph/)
})

test('approval alone changes a chapter, attaches source links, resets reading, and preserves the original', () => {
  let s = fixture(); s.theoryRead = ['mechanisms', 'other']
  const original = structuredClone(s.theory)
  const batch = batchFor(s)
  s = living.saveRevisionBatch(s, batch)
  assert.equal(s.theoryUpdates, undefined)
  assert.equal(ev.unreviewedPassages(s).length, 0)
  s = living.decideRevision(s, batch.revisions[0].id, 'approved')
  assert.deepEqual(s.theory, original)
  assert.equal(s.theoryUpdates.mechanisms, response().revisions[0].paragraphs[0].text)
  assert.equal(s.evidence.claims[0].links[0].passageId, 'passage')
  assert.equal(s.evidence.claims[0].sectionId, 'mechanisms:update')
  assert.deepEqual(s.theoryRead, ['other'])
  assert.match(theoryChunks(s)[0].text, /Reviewed evidence update/)
  assert.throws(() => living.decideRevision(s, batch.revisions[0].id, 'approved'), /no longer pending/)
})

test('rejection and no-change reviews never modify Theory', () => {
  let s = fixture(); const batch = batchFor(s)
  s = living.decideRevision(living.saveRevisionBatch(s, batch), batch.revisions[0].id, 'rejected')
  assert.equal(s.theoryUpdates, undefined)
  const noChange = living.parseRevisions(JSON.stringify({ summary: 'No relevant change supported by this passage.', revisions: [] }), fixture(), 'test')
  const assessed = living.saveRevisionBatch(fixture(), noChange)
  assert.equal(assessed.evidence.revisions.length, 0)
  assert.equal(ev.unreviewedPassages(assessed).length, 0)
})

test('chapter changes, missing sources, and new publication notices block stale approval', () => {
  const base = fixture(); const batch = batchFor(base)
  const pending = living.saveRevisionBatch(base, batch)
  const changed = structuredClone(pending); changed.theory.sections[0].body += ' New wording.'
  assert.throws(() => living.decideRevision(changed, batch.revisions[0].id, 'approved'), /chapter changed/)
  const removed = structuredClone(pending); removed.evidence.passages = []
  assert.throws(() => living.decideRevision(removed, batch.revisions[0].id, 'approved'), /source record/)
  const flagged = structuredClone(pending); flagged.evidence.notices = [{ doi: '10.1234/example', checkedAt: 2, notices: [{ doi: '10.1234/retraction', title: 'Retraction', type: 'retraction', source: 'retraction-watch' }] }]
  assert.throws(() => living.decideRevision(flagged, batch.revisions[0].id, 'approved'), /publication notices/)
  assert.equal(ev.unreviewedPassages(flagged).length, 1)
  const routine = structuredClone(pending); routine.evidence.notices = [{ doi: '10.1234/example', checkedAt: 3, notices: [] }]
  assert.equal(living.revisionProblem(routine, batch.revisions[0]), null)
  const missingDuringDraft = structuredClone(base); missingDuringDraft.evidence.passages = []
  assert.throws(() => living.saveRevisionBatch(missingDuringDraft, batch), /Evidence changed/)
})

test('curated sections accept reviewed updates without replacing their reference content', () => {
  const s = { ...fixture(), project: seed.project, theory: undefined }
  const doc = response(); doc.revisions[0].sectionId = 'overview'
  const batch = living.parseRevisions(JSON.stringify(doc), s, 'test')
  const approved = living.decideRevision(living.saveRevisionBatch(s, batch), batch.revisions[0].id, 'approved')
  assert.equal(approved.theory, undefined)
  assert.match(theoryChunks(approved)[0].text, /Brugada Syndrome/)
  assert.match(theoryChunks(approved)[0].text, /Reviewed evidence update/)
})

const study = (id, patch = {}) => ({ id, author: id, year: 2024, include: true, expEvents: 10, expTotal: 100, ctrlEvents: 5, ctrlTotal: 100, ...patch })
const withStudies = (studies) => ({ ...fixture(), review: { ...fixture().review, studies } })
const decideGroup = (s, ids, primary, decision = 'linked') => cohorts.reviewCohort(s, ids, decision, primary, 'The recruitment records confirm this decision.', cohorts.cohortReviewFingerprint(s, ids))

test('cohort flags use multiple clues or shared identifiers and never exclude reports automatically', () => {
  const a = study('a'), b = study('b')
  assert.equal(cohorts.overlapSignals(a, b), null)
  assert.equal(cohorts.overlapSignals({ ...a, author: 'Shared' }, { ...b, author: 'Shared' }).strength, 'possible')
  const studies = [study('a', { cohort: { registration: 'NCT00000001' } }), study('b', { note: 'Follow-up: NCT 00000001' })]
  const s = withStudies(studies)
  assert.equal(cohorts.cohortCandidates(s).length, 1)
  assert.equal(s.review.studies.filter((s) => s.include).length, 2)
  assert.equal(cohorts.overlapSignals(study('a', { cohort: { registration: 'NCT00000001' } }), study('b', { cohort: { registration: 'NCT00000002' } })), null)
})

test('reviewed groups merge transitively, select one report, and cannot double count in pooling or sensitivity analyses', () => {
  let s = withStudies([study('a'), study('b'), study('c'), study('d')])
  s = decideGroup(s, ['a', 'b'], 'a')
  s = decideGroup(s, ['c', 'd'], 'c')
  s = decideGroup(s, ['b', 'd'], 'd')
  assert.deepEqual(s.review.studies.map((s) => s.cohortPrimaryId), ['d', 'd', 'd', 'd'])
  assert.deepEqual(s.review.studies.filter(cohorts.analysisIncluded).map((s) => s.id), ['d'])
  const corrupted = s.review.studies.map((s) => ({ ...s, include: true }))
  assert.equal(meta.computeMeta(corrupted, 'random', 'OR').k, 1)
  assert.equal(meta.leaveOneOut(corrupted, 'random', 'OR').length, 0)
  const changed = decideGroup(s, ['a', 'd'], 'b')
  assert.deepEqual(changed.review.studies.filter(cohorts.analysisIncluded).map((s) => s.id), ['b'])
  const reopened = cohorts.unlinkCohort(changed, 'b')
  assert.ok(reopened.review.studies.every((s) => !s.cohortPrimaryId))
  assert.equal(reopened.review.studies.filter((s) => s.include).length, 1)
})

test('distinct reviews reappear on changed evidence, and concurrent group/outcome changes block confirmation', () => {
  let s = withStudies([study('a', { pmid: '123' }), study('b', { pmid: '123' })])
  s = decideGroup(s, ['a', 'b'], undefined, 'distinct')
  assert.equal(cohorts.cohortCandidates(s).length, 0)
  s.review.studies[0] = { ...s.review.studies[0], note: 'New recruitment information' }
  assert.equal(cohorts.cohortCandidates(s).length, 1)
  const expected = cohorts.cohortReviewFingerprint(s, ['a', 'b'])
  s.review.outcomeLabel = 'Different follow-up'
  assert.throws(() => cohorts.reviewCohort(s, ['a', 'b'], 'linked', 'a', 'Reason', expected), /outcome changed/)
  assert.throws(() => decideGroup(s, ['a', 'b'], 'missing'), /Choose the report/)
})

test('CSV and RIS preserve identity fields needed for linking and notices', () => {
  const csv = parseStudies('author,year,doi,trial_registration,cohort_name,centers,recruitment_start,recruitment_end\nA,2024,10.1234/example,NCT00000001,Cohort A,CMU,2020-01-01,2021-12-31').studies[0]
  assert.equal(csv.cohort.registration, 'NCT00000001')
  assert.equal(csv.cohort.recruitmentEnd, '2021-12-31')
  assert.equal(csv.doi, '10.1234/example')
  assert.equal(parseStudies('TY  - JOUR\nAU  - Author\nTI  - Study\nDO  - 10.1234/example\nER  -').studies[0].doi, '10.1234/example')
})

test('Crossref notices match the affected DOI, preserving distinct notice DOIs and provenance', () => {
  const work = { DOI: '10.1234/retraction', title: ['Retraction'], 'update-to': [{ DOI: 'https://doi.org/10.1234/EXAMPLE', type: 'retraction', source: 'retraction-watch', updated: { 'date-parts': [[2025, 1, 2]] } }, { DOI: '10.1234/unrelated', type: 'correction' }] }
  const n = notices.noticesFromWorks('10.1234/example', [work, work])
  assert.equal(n.length, 1)
  assert.equal(n[0].doi, '10.1234/retraction')
  assert.equal(n[0].source, 'retraction-watch')
  assert.equal(notices.noticesFromWorks('10.1234/other', [work]).length, 0)
})

test('Crossref checks reject failed or partial responses and support cancellation', async () => {
  const original = globalThis.fetch
  let called
  globalThis.fetch = async (url, opts) => { called = url; opts.signal.throwIfAborted(); return new Response(JSON.stringify({ message: { items: [], 'total-results': 0 } })) }
  try {
    assert.equal((await notices.checkPublicationNotices('doi:10.1234/EXAMPLE')).notices.length, 0)
    assert.equal(new URL(called).searchParams.get('filter'), 'updates:10.1234/example')
    const ctrl = new AbortController(); ctrl.abort()
    await assert.rejects(notices.checkPublicationNotices('10.1234/example', ctrl.signal), { name: 'AbortError' })
    globalThis.fetch = async () => new Response('{}', { status: 503 })
    await assert.rejects(notices.checkPublicationNotices('10.1234/example'), /503/)
    globalThis.fetch = async () => new Response(JSON.stringify({ message: { items: [], 'total-results': 2 } }))
    await assert.rejects(notices.checkPublicationNotices('10.1234/example'), /incomplete/)
  } finally { globalThis.fetch = original }
})

test('revision generation uses strict output, contains only project sources, and propagates API errors', async () => {
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage
  let payload
  globalThis.localStorage = { getItem: (key) => key.endsWith('.key') ? 'fake-key' : 'gpt-5.6-terra' }
  globalThis.fetch = async (_url, options) => { payload = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(response()) } }] })) }
  try {
    assert.equal((await living.draftRevisions(fixture(), new AbortController().signal)).revisions.length, 1)
    assert.equal(payload.response_format.json_schema.strict, true)
    assert.equal(payload.reasoning_effort, 'low')
    assert.doesNotMatch(payload.messages[1].content, /Brugada|SCN5A/)
    assert.match(payload.messages[1].content, /Confounding cannot be excluded/)
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }))
    await assert.rejects(living.draftRevisions(fixture(), new AbortController().signal), /truncated/)
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage }
})
