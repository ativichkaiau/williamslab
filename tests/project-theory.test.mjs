import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { createServer as createHttpServer } from 'node:http'

const server = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' })
const { blankProject, seed } = await server.ssrLoadModule('/src/data/seed.ts')
const { hasCuratedTheory, parseTheory, theoryMessages, generateTheory } = await server.ssrLoadModule('/src/lib/projectTheory.ts')
const { theoryChunks, retrieve, groundingBlock } = await server.ssrLoadModule('/src/lib/theoryRag.ts')
const { computeInstabilities } = await server.ssrLoadModule('/src/lib/suspension.ts')
const { systemPrompt, reviewPresets } = await server.ssrLoadModule('/src/lib/brsReview.ts')
const { listSessions, saveSession } = await server.ssrLoadModule('/src/lib/reviewSessions.ts')

after(() => server.close())

const sleep = blankProject('sleep-project', 'Sleep and learning', 'SLEEP', { question: 'How does sleep affect memory retention?', outcome: 'Memory retention' })
const document = {
  title: 'Sleep and memory theory',
  summary: 'A project-specific draft.',
  sections: ['Foundations', 'Mechanisms', 'Evidence', 'Research implications'].map((group) => ({ title: `${group} of sleep`, group, body: `Sleep and learning: ${group}. This is a draft for verification.` })),
}
const theory = { ...parseTheory(JSON.stringify(document)), generatedAt: 1, model: 'test', sources: [] }

test('only projects carrying the Brugada reference use curated theory', () => {
  assert.equal(hasCuratedTheory(seed.project), true)
  assert.equal(hasCuratedTheory(sleep.project), false)
  assert.equal(hasCuratedTheory(blankProject('different-brs', 'Brugada drug review', 'BRUGADA').project), false)
  assert.equal(theoryChunks(sleep).length, 0)
})

test('generation and review context contain only the supplied project', () => {
  const context = JSON.stringify(theoryMessages(sleep, 'Focus on learning'))
  assert.match(context, /Sleep and learning/)
  assert.match(context, /Memory retention/)
  assert.doesNotMatch(context, /Brugada|SCN5A|Nav1\.5/)
  assert.doesNotMatch(systemPrompt(sleep).content, /Brugada|SCN5A|epigenetic/)
  assert.doesNotMatch(JSON.stringify(reviewPresets(sleep)), /Brugada|SCN5A/)
})

test('retrieval uses the active project and identifies generated drafts', () => {
  const withTheory = { ...sleep, theory }
  assert.deepEqual(theoryChunks(withTheory).map((s) => s.title), document.sections.map((s) => s.title))
  const hits = retrieve('sleep', withTheory)
  assert.ok(hits.length > 0)
  assert.match(groundingBlock(hits, withTheory), /AI-generated draft, not verified primary evidence/)
  assert.deepEqual(retrieve('Brugada', sleep), [])
  assert.ok(retrieve('Brugada', seed).length > 0)
})

test('malformed, empty, and incomplete drafts are rejected before saving', () => {
  for (const value of ['', '{"title":', 'null', '[]', JSON.stringify({ ...document, sections: [] }), JSON.stringify({ ...document, sections: [{ title: 'Missing', group: 'Missing' }] }), JSON.stringify({ ...document, sections: [...document.sections.slice(0, 3), { title: 'Missing', group: 'Missing', body: ' ' }] })]) {
    assert.throws(() => parseTheory(value))
  }
  const parsed = parseTheory('```json\n' + JSON.stringify(document) + '\n```')
  assert.equal(parsed.sections.length, 4)
  assert.equal(new Set(parsed.sections.map((s) => s.id)).size, 4)
})

test('dashboard findings use actual outcome nodes and do not prescribe Brugada experiments', () => {
  assert.ok(!computeInstabilities(sleep).some((f) => f.id === 'inst_story_project'))
  const withOutcome = { ...sleep, nodes: [{ id: 'memory', label: 'Memory retention', type: 'ClinicalPhenotype' }], edges: [{ id: 'sleep-memory', src: 'sleep', dst: 'memory', rel: 'predicts', evidence: 'correlational' }] }
  const finding = computeInstabilities(withOutcome).find((f) => f.id === 'inst_story_project')
  assert.match(finding.comment, /Memory retention/)
  assert.doesNotMatch(JSON.stringify(computeInstabilities(withOutcome)), /Brugada|SCN5A|iPSC|demethylation|Naᵥ/)
  withOutcome.edges[0].evidence = 'causal'
  assert.ok(!computeInstabilities(withOutcome).some((f) => f.id === 'inst_story_project'))
})

test('saved review sessions do not appear in another project', () => {
  const storage = new Map()
  const original = globalThis.localStorage
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  try {
    saveSession({ id: 'old', title: 'Legacy Brugada session', ts: 1, model: 'test', messages: [] })
    saveSession({ id: 'sleep', projectId: sleep.project.id, title: 'Sleep', ts: 2, model: 'test', messages: [] })
    assert.deepEqual(listSessions(sleep.project.id).map((s) => s.id), ['sleep'])
    assert.deepEqual(listSessions(seed.project.id).map((s) => s.id), ['old'])
    assert.deepEqual(listSessions('other-project'), [])
  } finally { globalThis.localStorage = original }
})

test('generation requests structured output, preserves sources, and propagates cancellation', async () => {
  const originalFetch = globalThis.fetch
  const originalStorage = globalThis.localStorage
  let request
  globalThis.localStorage = { getItem: (key) => key.endsWith('.key') ? 'fake-test-key' : 'gpt-5.6-terra' }
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body)
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(document) } }] }))
  }
  try {
    const result = await generateTheory(sleep, 'Learning', new AbortController().signal)
    assert.equal(result.sections.length, 4)
    assert.equal(request.response_format.json_schema.strict, true)
    assert.equal(request.max_completion_tokens, 12000)
    assert.equal(request.reasoning_effort, 'low')
    assert.deepEqual(result.sources, [])
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(generateTheory(sleep, '', controller.signal), { name: 'AbortError' })
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Insufficient quota' } }), { status: 429 })
    await assert.rejects(generateTheory(sleep, '', new AbortController().signal), /Insufficient quota/)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalStorage
  }
})
