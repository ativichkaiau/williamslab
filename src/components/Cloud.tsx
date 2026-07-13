import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Modal, Field } from './Modal'
import {
  isCloudConfigured, cloudConfigSource, setCloudConfig,
  signInEmail, signOut, onAuth,
  loadCloudState, saveCloudState, shareProject,
} from '../lib/supabase'

// Headless cloud sync + the account/config panel. Rendered once in Layout.
export default function Cloud({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { getSnapshot, restoreSnapshot, allProjects, activeId, exportActive, state } = useStore()
  const [email, setEmail] = useState<string | null>(null)
  const [configured, setConfigured] = useState(isCloudConfigured())
  const [urlDraft, setUrlDraft] = useState('')
  const [keyDraft, setKeyDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const saveTimer = useRef<number | null>(null)

  // watch auth; on sign-in, cloud state wins (load it), else seed the cloud
  useEffect(() => {
    if (!configured) return
    return onAuth(async (e) => {
      setEmail(e)
      if (e) {
        try {
          const cloud = await loadCloudState()
          if (cloud) restoreSnapshot(JSON.stringify(cloud))
          else await saveCloudState(JSON.parse(getSnapshot()))
          setLastSync(Date.now())
        } catch {
          /* offline / rls issue — keep working locally */
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  // debounced push of local changes to the cloud while signed in
  useEffect(() => {
    if (!configured || !email) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveCloudState(JSON.parse(getSnapshot()))
        setLastSync(Date.now())
      } catch {
        /* ignore */
      }
    }, 1600)
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjects, activeId, email, configured])

  async function connect() {
    setCloudConfig(urlDraft, keyDraft)
    setConfigured(isCloudConfigured())
    setNote(isCloudConfigured() ? 'Connected. Now sign in with your email.' : 'Enter both the project URL and the anon key.')
  }
  async function sendLink() {
    if (!emailDraft.trim()) return
    setBusy(true); setNote('')
    try {
      await signInEmail(emailDraft)
      setNote(`Magic link sent to ${emailDraft}. Open it on this device to finish signing in.`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }
  async function share() {
    setBusy(true); setNote(''); setShareUrl('')
    try {
      const id = await shareProject(state.project.name, JSON.parse(exportActive()))
      setShareUrl(`${location.origin}/#/shared/${id}`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Share failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  const src = cloudConfigSource()

  return (
    <Modal title="☁ Cloud sync & sharing" onClose={onClose}>
      {!configured ? (
        <>
          <p className="small" style={{ marginBottom: 12 }}>Connect a Supabase project to sync your workspace across devices and share projects. Create a free project, run <code>db/supabase-schema.sql</code> in its SQL editor, then paste the project URL and anon key below (the anon key is public and RLS-protected).</p>
          <Field label="Project URL"><input className="input" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="https://xxxx.supabase.co" /></Field>
          <Field label="Anon (public) key"><input className="input" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="eyJhbGci…" /></Field>
          <div className="form-actions">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={connect} disabled={!urlDraft.trim() || !keyDraft.trim()}>Connect</button>
          </div>
        </>
      ) : !email ? (
        <>
          <p className="small" style={{ marginBottom: 12 }}>Cloud connected ({src === 'env' ? 'from .env' : 'from this browser'}). Sign in with a magic link — no password.</p>
          <Field label="Email"><input className="input" type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="you@lab.edu" /></Field>
          <div className="form-actions">
            {src === 'settings' && <button className="icon-btn danger" onClick={() => { setCloudConfig('', ''); setConfigured(false) }}>Disconnect project</button>}
            <span className="spacer" />
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn primary" onClick={sendLink} disabled={busy || !emailDraft.trim()}>{busy ? 'Sending…' : 'Send magic link'}</button>
          </div>
        </>
      ) : (
        <>
          <div className="kv"><span className="k">Signed in</span><span className="val"><b>{email}</b></span></div>
          <div className="kv"><span className="k">Sync</span><span className="val">{lastSync ? `last synced ${new Date(lastSync).toLocaleTimeString()}` : 'syncing…'} · auto-saves on every edit</span></div>
          <div className="divider" />
          <div className="card-h" style={{ fontSize: 10 }}>SHARE THE ACTIVE PROJECT</div>
          <p className="small" style={{ marginBottom: 8 }}>Create a public read-only link to <b>{state.project.code}</b> that anyone can open and import.</p>
          {shareUrl ? (
            <div className="flex" style={{ gap: 8 }}>
              <input className="input" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
              <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy</button>
            </div>
          ) : (
            <button className="btn ghost sm" onClick={share} disabled={busy}>{busy ? 'Creating…' : '↗ Create share link'}</button>
          )}
          <div className="form-actions">
            <button className="icon-btn danger" onClick={async () => { await signOut(); setEmail(null) }}>Sign out</button>
            <span className="spacer" />
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        </>
      )}
      {note && <p className="small" style={{ marginTop: 10, color: 'var(--accent)' }}>{note}</p>}
    </Modal>
  )
}
