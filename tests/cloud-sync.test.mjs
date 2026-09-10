import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { webcrypto } from 'node:crypto'
import { createServer as createHttpServer } from 'node:http'

globalThis.crypto ??= webcrypto
const vite = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' })
const { blankProject } = await vite.ssrLoadModule('/src/data/seed.ts')
const { WorkspaceSync, canonical, fingerprints, validateBundle, watchWorkspaceSync, WORKSPACE_SAVED, reportWorkspaceSave, assertWorkspaceSaved } = await vite.ssrLoadModule('/src/lib/cloudSync.ts')
after(() => vite.close())
const copy = structuredClone
const workspace = (title = 'Initial') => ({ v: 1, app: { activeId: 'a', projects: [blankProject('a', title, 'A'), blankProject('b', 'Second project', 'B')] }, litlink: null })

function cloud(bundle = null) {
  return { row: bundle ? { bundle: copy(bundle), updatedAt: '1' } : null, writes: 0, revision: 1 }
}
function device(bundle, server, overrides = {}) {
  const data = { local: copy(bundle), base: null, backups: [], statuses: [], applied: 0 }
  const io = {
    readLocal: () => copy(data.local),
    applyLocal: (value) => { data.applied++; data.local = copy(value) },
    readCheckpoint: () => copy(data.base),
    checkpoint: (value) => { data.base = copy(value) },
    backup: (value) => data.backups.push(copy(value)),
    belongsToAnotherAccount: () => false,
    readRemote: async () => copy(server.row),
    writeRemote: async (value, expected) => {
      if ((server.row?.updatedAt ?? null) !== expected) return null
      server.writes++
      server.row = { bundle: copy(value), updatedAt: String(++server.revision) }
      return copy(server.row)
    },
    ...overrides,
  }
  const sync = new WorkspaceSync(io, (status) => data.statuses.push(status))
  return { data, sync, io, phase: () => data.statuses.at(-1)?.phase }
}

test('initial connection downloads the existing cloud before any upload and preserves a local backup', async () => {
  const server = cloud(workspace('Cloud content'))
  const ipad = device(workspace('Stale iPad content'), server)
  await ipad.sync.sync()
  assert.equal(ipad.data.local.app.projects[0].project.name, 'Cloud content')
  assert.equal(ipad.data.backups[0].app.projects[0].project.name, 'Stale iPad content')
  assert.equal(server.writes, 0)
  assert.equal(ipad.phase(), 'synced')
})

test('two devices exchange project content, generated theory, progress, and LitLink in both directions', async () => {
  const server = cloud()
  const desktop = device(workspace(), server)
  await desktop.sync.sync()
  const ipad = device(workspace('Old'), server)
  await ipad.sync.sync()
  ipad.data.local.app.projects[0].theory = { title: 'From iPad', sections: [] }
  ipad.data.local.app.projects[0].theoryRead = ['section-1']
  ipad.data.local.litlink = { cohort: 'iPad cohort', groups: [] }
  await ipad.sync.sync()
  await desktop.sync.sync()
  assert.deepEqual(desktop.data.local, ipad.data.local)
  desktop.data.local.app.projects[1].project.name = 'Updated on desktop'
  await desktop.sync.sync()
  await ipad.sync.sync()
  assert.deepEqual(desktop.data.local, ipad.data.local)
  assert.equal(ipad.phase(), 'synced')
})

test('JSONB key ordering, project selection, and clean downloads do not cause upload loops', async () => {
  const original = workspace()
  const server = cloud(JSON.parse(canonical(original)))
  const ipad = device(original, server)
  await ipad.sync.sync()
  ipad.data.local.app.activeId = 'b'
  await ipad.sync.sync()
  await ipad.sync.sync()
  assert.equal(ipad.data.local.app.activeId, 'b')
  assert.equal(server.writes, 0)
})

test('independent project edits merge and project deletions propagate', async () => {
  const server = cloud(workspace())
  const a = device(workspace(), server)
  const b = device(workspace(), server)
  await Promise.all([a.sync.sync(), b.sync.sync()])
  a.data.local.app.projects[0].project.name = 'Desktop edit'
  b.data.local.app.projects[1].project.name = 'iPad edit'
  await a.sync.sync()
  await b.sync.sync()
  assert.deepEqual(server.row.bundle.app.projects.map((p) => p.project.name), ['Desktop edit', 'iPad edit'])
  await a.sync.sync()
  b.data.local.app.projects.splice(0, 1)
  b.data.local.app.activeId = 'b'
  await b.sync.sync()
  await a.sync.sync()
  assert.deepEqual(a.data.local.app.projects.map((p) => p.project.id), ['b'])
  assert.equal(a.data.local.app.activeId, 'b')
})

test('conflicting changes keep both copies intact until a choice and preserve other project edits', async () => {
  const server = cloud(workspace())
  const a = device(workspace(), server)
  const b = device(workspace(), server)
  await Promise.all([a.sync.sync(), b.sync.sync()])
  a.data.local.app.projects[0].project.name = 'Desktop edit'
  b.data.local.app.projects[0].project.name = 'iPad edit'
  b.data.local.app.projects[1].project.name = 'Independent iPad edit'
  await a.sync.sync()
  await b.sync.sync()
  assert.equal(b.phase(), 'conflict')
  assert.equal(b.data.local.app.projects[0].project.name, 'iPad edit')
  assert.equal(server.row.bundle.app.projects[0].project.name, 'Desktop edit')
  await b.sync.sync('cloud')
  assert.equal(b.phase(), 'synced')
  assert.deepEqual(server.row.bundle.app.projects.map((p) => p.project.name), ['Desktop edit', 'Independent iPad edit'])
  assert.equal(b.data.backups[0].app.projects[0].project.name, 'iPad edit')
})

test('a concurrent server write is re-read instead of overwritten', async () => {
  const server = cloud(workspace())
  const a = device(workspace(), server)
  await a.sync.sync()
  a.data.local.app.projects[0].project.name = 'Local edit'
  const normalWrite = a.io.writeRemote
  let raced = false
  a.io.writeRemote = async (...args) => {
    if (!raced) {
      raced = true
      server.row.bundle.app.projects[1].project.name = 'Concurrent remote edit'
      server.row.updatedAt = String(++server.revision)
    }
    return normalWrite(...args)
  }
  await a.sync.sync()
  assert.equal(a.phase(), 'synced')
  assert.deepEqual(server.row.bundle.app.projects.map((p) => p.project.name), ['Local edit', 'Concurrent remote edit'])
})

test('edits during an upload remain local and are sent on the next pass', async () => {
  const server = cloud(workspace())
  const a = device(workspace(), server)
  await a.sync.sync()
  a.data.local.app.projects[0].project.name = 'First edit'
  const normalWrite = a.io.writeRemote
  let edited = false
  a.io.writeRemote = async (...args) => {
    const result = await normalWrite(...args)
    if (!edited) { edited = true; a.data.local.app.projects[0].project.name = 'Newer edit during upload' }
    return result
  }
  await a.sync.sync()
  assert.equal(a.phase(), 'synced')
  assert.equal(server.row.bundle.app.projects[0].project.name, 'Newer edit during upload')
  assert.deepEqual(a.data.local, server.row.bundle)
})

test('read/write errors are visible and never reported as synced', async () => {
  const server = cloud(workspace())
  const a = device(workspace(), server, { readRemote: async () => { throw new Error('Access denied') } })
  await a.sync.sync()
  assert.equal(a.phase(), 'error')
  assert.match(a.data.statuses.at(-1).message, /Access denied/)
  assert.equal(server.writes, 0)
  assert.equal(a.data.applied, 0)
  const b = device(workspace(), cloud(), { writeRemote: async () => { throw new Error('Network failure') } })
  await b.sync.sync()
  assert.equal(b.phase(), 'error')
  assert.equal(b.data.base, null)
})

test('typing during a merged upload cannot revert remote changes that are not yet applied locally', async () => {
  const server = cloud(workspace())
  const a = device(workspace(), server)
  await a.sync.sync()
  a.data.local.app.projects[0].project.name = 'First local edit'
  server.row.bundle.app.projects[1].project.name = 'Incoming remote edit'
  server.row.updatedAt = String(++server.revision)
  const normalWrite = a.io.writeRemote
  let edited = false
  a.io.writeRemote = async (...args) => {
    const result = await normalWrite(...args)
    if (!edited) { edited = true; a.data.local.app.projects[0].project.name = 'New local edit during upload' }
    return result
  }
  await a.sync.sync()
  assert.equal(a.phase(), 'synced')
  assert.deepEqual(a.data.local.app.projects.map((p) => p.project.name), ['New local edit during upload', 'Incoming remote edit'])
  assert.deepEqual(server.row.bundle, a.data.local)
})

test('failed backup or device storage leaves the checkpoint unchanged and cannot later upload a stale copy', async () => {
  const server = cloud(workspace('New cloud content'))
  for (const failing of ['backup', 'applyLocal']) {
    const a = device(workspace('Old local content'), server, { [failing]: () => { throw new Error('Storage full') } })
    await a.sync.sync()
    assert.equal(a.phase(), 'error')
    assert.equal(a.data.base, null)
    await a.sync.sync()
    assert.equal(server.writes, 0)
    assert.equal(a.data.local.app.projects[0].project.name, 'Old local content')
  }
})

test('sign-out/pause aborts pending sync before it can apply data or upload', async () => {
  const server = cloud(workspace('Remote'))
  let release
  const a = device(workspace(), server, { readRemote: () => new Promise((resolve) => { release = resolve }) })
  const running = a.sync.sync()
  a.sync.stop()
  release(server.row)
  await running
  assert.equal(a.data.applied, 0)
  assert.equal(a.data.base, null)
  assert.equal(server.writes, 0)
  assert.ok(!a.data.statuses.some((s) => s.phase === 'synced'))
})

test('account changes do not automatically upload the previous account workspace', async () => {
  const server = cloud()
  const a = device(workspace(), server, { belongsToAnotherAccount: () => true })
  await a.sync.sync()
  assert.equal(a.phase(), 'conflict')
  assert.equal(server.writes, 0)
  await a.sync.sync('local')
  assert.equal(server.writes, 1)
})

test('edits during first connection require a choice even on the next polling pass', async () => {
  const server = cloud(workspace('Remote'))
  let release
  const a = device(workspace(), server, { readRemote: () => new Promise((resolve) => { release = resolve }) })
  const running = a.sync.sync()
  a.data.local.app.projects[0].project.name = 'New local edit'
  release(server.row)
  await running
  assert.equal(a.phase(), 'conflict')
  a.io.readRemote = async () => server.row
  await a.sync.sync()
  assert.equal(a.phase(), 'conflict')
  assert.equal(a.data.applied, 0)
  await a.sync.sync('local')
  assert.equal(server.row.bundle.app.projects[0].project.name, 'New local edit')
})

test('invalid cloud bundles are rejected and project hashes include theory and progress', async () => {
  for (const value of [null, {}, { v: 2, app: workspace().app }, { v: 1, app: { projects: [] } }, { ...workspace(), litlink: { groups: 'bad' } }]) assert.throws(() => validateBundle(value))
  const a = workspace()
  const old = await fingerprints(a)
  a.app.projects[0].theoryRead = ['new']
  assert.notDeepEqual(await fingerprints(a), old)
  assert.deepEqual(validateBundle(JSON.parse(canonical(a))), JSON.parse(JSON.stringify(a)))
})

test('failed local saves prevent false sync success until each affected store can save again', () => {
  reportWorkspaceSave('app', false, false)
  reportWorkspaceSave('litlink', true, false)
  assert.throws(assertWorkspaceSaved, /Local changes could not be stored/)
  reportWorkspaceSave('app', true, false)
  assert.doesNotThrow(assertWorkspaceSaved)
})

test('scheduler checks on resume/reconnect, queues local saves, reports offline, and cleans up', async () => {
  const previous = Object.fromEntries(['window', 'document', 'navigator'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  const window = new EventTarget()
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const navigator = { onLine: true }
  for (const [k, value] of Object.entries({ window, document, navigator })) Object.defineProperty(globalThis, k, { configurable: true, value })
  let checks = 0, pending = 0, offline = 0, stopped = 0
  const stop = watchWorkspaceSync({ sync: async () => { checks++ }, pending: () => { pending++ }, offline: () => { offline++ }, stop: () => { stopped++ } }, 5, 1000)
  try {
    assert.equal(checks, 1)
    document.visibilityState = 'hidden'
    window.dispatchEvent(new Event('focus'))
    assert.equal(checks, 1)
    document.visibilityState = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pageshow'))
    assert.equal(checks, 3)
    navigator.onLine = false
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event(WORKSPACE_SAVED))
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(pending, 1)
    assert.ok(offline >= 2)
    assert.equal(checks, 3)
    navigator.onLine = true
    window.dispatchEvent(new Event('online'))
    assert.equal(checks, 4)
    stop()
    window.dispatchEvent(new Event('focus'))
    assert.equal(checks, 4)
    assert.equal(stopped, 1)
  } finally {
    stop()
    for (const [k, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, k, descriptor)
      else delete globalThis[k]
    }
  }
})
