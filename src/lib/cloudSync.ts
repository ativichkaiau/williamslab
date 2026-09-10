import type { ProjectState } from '../types'
import type { LitLinkState } from './litlink'

export const WORKSPACE_SAVED = 'williamslab:save'
export const WORKSPACE_RESTORED = 'williamslab:restore'
const unsavedStores = new Set<string>()

export function reportWorkspaceSave(key: string, persisted: boolean, notify = true) {
  if (persisted) unsavedStores.delete(key)
  else unsavedStores.add(key)
  if (notify) window.dispatchEvent(new Event(WORKSPACE_SAVED))
}

export function assertWorkspaceSaved() {
  if (unsavedStores.size) throw new Error('Local changes could not be stored on this device. Free browser storage, then save again before syncing.')
}

export interface Bundle {
  v: 1
  app: { projects: ProjectState[]; activeId: string }
  litlink: LitLinkState | null
}
export interface CloudCopy { bundle: Bundle; updatedAt: string }
export type Fingerprints = Record<string, string>
export type Resolution = 'cloud' | 'local'
export interface SyncStatus {
  phase: 'paused' | 'checking' | 'pending' | 'synced' | 'offline' | 'conflict' | 'error'
  message: string
  checkedAt?: number
  updatedAt?: string
}
export interface SyncIO {
  readLocal: () => Bundle
  applyLocal: (bundle: Bundle) => void
  readCheckpoint: () => Fingerprints | null
  checkpoint: (fingerprints: Fingerprints) => void
  backup: (bundle: Bundle) => void
  belongsToAnotherAccount: () => boolean
  readRemote: (signal: AbortSignal) => Promise<CloudCopy | null>
  // A null result means another device wrote after our read; retry the merge.
  writeRemote: (bundle: Bundle, expected: string | null, signal: AbortSignal) => Promise<CloudCopy | null>
}

const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x)

export function validateBundle(value: unknown): Bundle {
  if (!object(value) || value.v !== 1 || !object(value.app) || !Array.isArray(value.app.projects) || !value.app.projects.length) {
    throw new Error('The cloud workspace has an unsupported or incomplete format. The device copy has been kept.')
  }
  const ids = new Set<string>()
  for (const p of value.app.projects) {
    if (!object(p) || !object(p.project) || typeof p.project.id !== 'string' || !p.project.id || ids.has(p.project.id)
      || !['name', 'code', 'domain', 'centralHypothesis'].every((key) => typeof (p.project as Record<string, unknown>)[key] === 'string')
      || !object(p.review) || !object(p.review.pico) || !Array.isArray(p.review.studies)
      || !['p', 'i', 'c', 'o'].every((key) => typeof ((p.review as Record<string, unknown>).pico as Record<string, unknown>)[key] === 'string')
      || !['nodes', 'edges', 'hypotheses', 'assays', 'papers'].every((key) => Array.isArray(p[key]))) {
      throw new Error('The cloud workspace contains an incomplete project. The device copy has been kept.')
    }
    ids.add(p.project.id)
  }
  if (value.litlink != null && (!object(value.litlink) || typeof value.litlink.cohort !== 'string' || !Array.isArray(value.litlink.groups))) {
    throw new Error('The cloud LitLink data is incomplete. The device copy has been kept.')
  }
  return { ...value, litlink: value.litlink ?? null } as unknown as Bundle
}

// JSONB reorders object keys; compare content rather than serialization order.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (object(value)) return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

function parts(bundle: Bundle): Map<string, unknown> {
  return new Map([
    ...bundle.app.projects.map((p) => [`project:${p.project.id}`, p] as [string, unknown]),
    ['litlink', bundle.litlink],
  ])
}

export async function fingerprints(bundle: Bundle): Promise<Fingerprints> {
  const pairs = await Promise.all([...parts(bundle)].map(async ([key, value]) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))
    return [key, [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')]
  }))
  return Object.fromEntries(pairs)
}

export function withLocalSelection(bundle: Bundle, local: Bundle): Bundle {
  const ids = bundle.app.projects.map((p) => p.project.id)
  const activeId = ids.includes(local.app.activeId) ? local.app.activeId : ids.includes(bundle.app.activeId) ? bundle.app.activeId : ids[0]
  return { ...bundle, app: { ...bundle.app, activeId } }
}

export function mergeBundles(base: Fingerprints, local: Bundle, remote: Bundle, localHashes: Fingerprints, remoteHashes: Fingerprints, resolution?: Resolution): { bundle: Bundle; conflicts: string[] } {
  const left = parts(local)
  const right = parts(remote)
  const chosen = new Map<string, unknown>()
  const conflicts: string[] = []
  for (const key of new Set([...Object.keys(base), ...right.keys(), ...left.keys()])) {
    const l = localHashes[key]
    const r = remoteHashes[key]
    let source = right
    if (l === r || l === base[key]) source = right
    else if (r === base[key]) source = left
    else {
      const p = (left.get(key) ?? right.get(key)) as ProjectState | undefined
      conflicts.push(key === 'litlink' ? 'LitLink' : p?.project?.name || key)
      source = resolution === 'local' ? left : right
    }
    if (source.has(key)) chosen.set(key, source.get(key))
  }
  let projects = [...chosen.entries()].filter(([key]) => key.startsWith('project:')).map(([, p]) => p as ProjectState)
  if (!projects.length) {
    conflicts.push('Project deletions')
    projects = resolution === 'local' ? local.app.projects : remote.app.projects
  }
  return { bundle: withLocalSelection({ ...remote, app: { ...remote.app, projects }, litlink: chosen.get('litlink') as LitLinkState | null }, local), conflicts }
}

// One serialized read/merge/write loop per signed-in device. The checkpoint is
// small, account-scoped content hashes, not another full workspace in storage.
export class WorkspaceSync {
  private running: Promise<void> | null = null
  private controller: AbortController | null = null
  private stopped = false
  private initialConflict = false
  private last: SyncStatus = { phase: 'paused', message: 'Automatic sync is off. Use Sync now to exchange changes.' }

  constructor(private io: SyncIO, private notify: (status: SyncStatus) => void) {}

  private status(phase: SyncStatus['phase'], message: string, extra: Partial<SyncStatus> = {}) {
    if (this.stopped) return
    this.last = { ...this.last, phase, message, ...extra }
    this.notify(this.last)
  }

  pending() { this.status('pending', 'Local changes are waiting to sync.') }
  offline() { this.status('offline', 'Offline. Changes are kept on this device and will sync after reconnecting.') }
  stop() { this.stopped = true; this.controller?.abort() }

  sync(resolution?: Resolution): Promise<void> {
    if (this.stopped) return Promise.resolve()
    if (this.running) return this.running
    this.controller = new AbortController()
    const signal = this.controller.signal
    const timeout = setTimeout(() => this.controller?.abort(), 30000)
    this.running = this.run(signal, resolution).catch((e: unknown) => {
      this.status('error', signal.aborted ? 'Cloud sync timed out. Your device copy is safe; try Sync now again.' : e instanceof Error ? e.message : 'Cloud sync failed. Your device copy is safe.')
    }).finally(() => {
      clearTimeout(timeout)
      this.running = null
      this.controller = null
    })
    return this.running
  }

  private async run(signal: AbortSignal, resolution?: Resolution) {
    this.status('checking', 'Checking both device and cloud changes…')
    for (let attempt = 0; attempt < 5; attempt++) {
      const beforeRead = canonical(this.io.readLocal())
      const remote = await this.io.readRemote(signal)
      signal.throwIfAborted()
      const local = this.io.readLocal()
      const captured = canonical(local)
      const localHashes = await fingerprints(local)
      const remoteHashes = remote ? await fingerprints(remote.bundle) : null
      const differentAccount = this.io.belongsToAnotherAccount()
      const base = differentAccount ? null : this.io.readCheckpoint()
      let target = local
      let backup = false

      if (remote && remoteHashes) {
        if (!base) {
          // First connection: read the existing cloud workspace before any
          // upload, retaining this device's previous workspace as a backup.
          if ((this.initialConflict || beforeRead !== captured) && !resolution) {
            this.initialConflict = true
            this.status('conflict', 'This device was edited while connecting to an existing cloud workspace. Choose which workspace to keep.', { updatedAt: remote.updatedAt })
            return
          }
          target = resolution === 'local' ? local : withLocalSelection(remote.bundle, local)
          backup = canonical(localHashes) !== canonical(remoteHashes)
        } else {
          const merged = mergeBundles(base, local, remote.bundle, localHashes, remoteHashes, resolution)
          if (merged.conflicts.length && !resolution) {
            this.status('conflict', `Both devices changed ${merged.conflicts.join(', ')}. Choose which changes to keep for those items; other projects will be merged.`, { updatedAt: remote.updatedAt })
            return
          }
          target = merged.bundle
          backup = merged.conflicts.length > 0
        }
      } else if (differentAccount && resolution !== 'local') {
        this.status('conflict', 'This device contains another account’s workspace. This account has no cloud copy. Choose this device’s changes only if you want to copy them to this account.', { updatedAt: undefined })
        return
      } else if (base && resolution !== 'local') {
        this.status('conflict', 'The previously synced cloud copy is missing. Your device copy has been kept. Choose this device’s changes to recreate the cloud copy.', { updatedAt: undefined })
        return
      }

      const targetHashes = await fingerprints(target)
      signal.throwIfAborted()
      if (canonical(this.io.readLocal()) !== captured) continue
      if (backup) this.io.backup(local) // Must succeed before replacing any local work.
      let confirmed = remote
      if (!remote || canonical(targetHashes) !== canonical(remoteHashes)) {
        confirmed = await this.io.writeRemote(target, remote?.updatedAt ?? null, signal)
        signal.throwIfAborted()
        if (!confirmed) continue // A concurrent writer won; re-read before retrying.
      }
      // If typing continued during upload, compare the next pass to the local
      // snapshot we started with. Remote-only changes in the merged upload have
      // not reached this device yet; treating them as applied would revert them.
      if (canonical(this.io.readLocal()) !== captured) {
        this.io.checkpoint(localHashes)
        continue
      }
      const next = withLocalSelection(target, local)
      if (canonical(next) !== captured) this.io.applyLocal(next)
      this.io.checkpoint(targetHashes)
      this.initialConflict = false
      this.status('synced', backup ? 'Synced. The previous device workspace is available as a local backup.' : 'Device and cloud changes are synced.', { checkedAt: Date.now(), updatedAt: confirmed!.updatedAt })
      return
    }
    this.status('pending', 'Changes are still arriving. Sync will retry shortly.')
  }
}

// Polling also works in existing Supabase projects without enabling Realtime.
// iPad/Safari tabs are suspended in the background, so resume events are vital.
export function watchWorkspaceSync(sync: WorkspaceSync, delay = 1500, interval = 15000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const check = () => {
    if (!navigator.onLine) { sync.offline(); return }
    if (document.visibilityState === 'visible') void sync.sync()
  }
  const saved = () => {
    sync.pending()
    clearTimeout(timer)
    timer = setTimeout(check, delay)
  }
  const storage = (e: StorageEvent) => {
    if (e.key === 'williamslab.app.v2' || e.key === 'williamslab.litlink') saved()
  }
  const offline = () => sync.offline()
  window.addEventListener(WORKSPACE_SAVED, saved)
  window.addEventListener('storage', storage)
  window.addEventListener('focus', check)
  window.addEventListener('pageshow', check)
  window.addEventListener('online', check)
  window.addEventListener('offline', offline)
  document.addEventListener('visibilitychange', check)
  const poll = setInterval(check, interval)
  check()
  return () => {
    clearTimeout(timer)
    clearInterval(poll)
    window.removeEventListener(WORKSPACE_SAVED, saved)
    window.removeEventListener('storage', storage)
    window.removeEventListener('focus', check)
    window.removeEventListener('pageshow', check)
    window.removeEventListener('online', check)
    window.removeEventListener('offline', offline)
    document.removeEventListener('visibilitychange', check)
    sync.stop()
  }
}
