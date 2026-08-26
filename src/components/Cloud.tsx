import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import {
  isCloudConfigured, cloudConfigSource, setCloudConfig,
  signInEmail, verifyEmailCode, signOut, onAuth,
  saveCloudState, restoreCloudState, cloudStateInfo, shareProject,
} from '../lib/supabase'

const AUTOSYNC_LS = 'williamslab.cloud.autosync'

export default function Cloud({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore()
  const [email, setEmail] = useState<string | null>(null) // signed-in email
  const [configured, setConfigured] = useState(isCloudConfigured())
  const [source, setSource] = useState(cloudConfigSource())
  const [cloudInfo, setCloudInfo] = useState<{ exists: boolean; updatedAt?: string }>({ exists: false })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem(AUTOSYNC_LS) !== 'off')

  // config form
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  // sign-in form
  const [loginEmail, setLoginEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')

  // track auth state
  useEffect(() => {
    if (!configured) return
    const off = onAuth((e) => setEmail(e))
    return off
  }, [configured])

  // refresh cloud-copy info when signed in / panel opens
  useEffect(() => {
    if (email) cloudStateInfo().then(setCloudInfo).catch(() => {})
  }, [email, open])

  // debounced auto-push on local changes
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    function onSave() {
      if (!email || !autoSync) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => { saveCloudState().then(() => cloudStateInfo().then(setCloudInfo)).catch(() => {}) }, 2500)
    }
    window.addEventListener('williamslab:save', onSave)
    return () => { window.removeEventListener('williamslab:save', onSave); if (timer.current) clearTimeout(timer.current) }
  }, [email, autoSync])

  function saveConfig() {
    const err = setCloudConfig(url, key)
    if (err) { setMsg({ ok: false, text: err }); return }
    setUrl(''); setKey('')
    setConfigured(isCloudConfigured())
    setSource(cloudConfigSource())
    setMsg({ ok: true, text: 'Connected. Sign in with your email below.' })
  }
  function disconnect() {
    if (!confirm('Disconnect this device from the cloud? Your local data stays; sign-in and sync stop.')) return
    setCloudConfig('', '')
    setConfigured(false); setSource('none'); setEmail(null); setCloudInfo({ exists: false })
  }
  async function sendLink() {
    if (!loginEmail.trim()) return
    setBusy('login'); setMsg(null)
    try { await signInEmail(loginEmail); setSent(true); setMsg({ ok: true, text: `Email sent to ${loginEmail.trim()}. Paste the 6-digit code below, or click the link (in this browser).` }) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not send the email.' }) }
    finally { setBusy(null) }
  }
  async function verifyCode() {
    if (!code.trim()) return
    setBusy('verify'); setMsg(null)
    try { await verifyEmailCode(loginEmail, code); setSent(false); setCode('') /* onAuth flips to signed-in */ }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'That code is invalid or expired — send a fresh one.' }) }
    finally { setBusy(null) }
  }
  async function doSave() {
    setBusy('save'); setMsg(null)
    try { await saveCloudState(); setCloudInfo(await cloudStateInfo()); setMsg({ ok: true, text: 'Saved this workspace to the cloud.' }) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' }) }
    finally { setBusy(null) }
  }
  async function doRestore() {
    if (!confirm('Replace this device’s data with the cloud copy? Unsaved local changes will be overwritten.')) return
    setBusy('restore'); setMsg(null)
    try {
      const ok = await restoreCloudState()
      if (ok) { setMsg({ ok: true, text: 'Restored — reloading…' }); setTimeout(() => location.reload(), 700) }
      else setMsg({ ok: false, text: 'No cloud copy to restore yet.' })
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed.' }); setBusy(null) }
  }
  async function doShare() {
    setBusy('share'); setMsg(null); setShareLink(null)
    try {
      const id = await shareProject(state.project.name, state)
      setShareLink(`${location.origin}${location.pathname}#/shared/${id}`)
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Share failed.' }) }
    finally { setBusy(null) }
  }
  async function doSignOut() { await signOut(); setEmail(null); setShareLink(null); setMsg(null) }
  function toggleAuto() {
    setAutoSync((v) => { const n = !v; localStorage.setItem(AUTOSYNC_LS, n ? 'on' : 'off'); return n })
  }

  if (!open) return null
  return (
    <div className="kbd-overlay" onClick={onClose}>
      <div className="kbd-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="kbd-head">
          <b>☁ Cloud sync &amp; sharing</b>
          <button className="ai-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: '4px 2px' }}>
          {!configured ? (
            <>
              <p className="small" style={{ marginBottom: 12 }}>Bring your own free <b>Supabase</b> project — your data stays in your account. Run <span className="mono">db/supabase-schema.sql</span> once in the Supabase SQL editor, then paste the project URL and the <b>anon</b> public key (it’s RLS-protected — safe on the client; never the service_role secret).</p>
              <label className="fld"><span className="fld-l">Project URL</span><input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></label>
              <label className="fld"><span className="fld-l">Anon public key</span><input className="input mono" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" /></label>
              <button className="btn primary sm" onClick={saveConfig}>Connect</button>
            </>
          ) : !email ? (
            <>
              <p className="small" style={{ marginBottom: 4 }}>✓ Connected <span className="muted">({source === 'env' ? 'from environment' : 'this device'})</span>. Sign in to sync across devices — passwordless.</p>
              <label className="fld"><span className="fld-l">Email</span><input className="input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendLink()} placeholder="you@example.com" /></label>
              {sent && (
                <label className="fld"><span className="fld-l">6-digit code from the email</span>
                  <div className="flex" style={{ gap: 8 }}>
                    <input className="input mono" style={{ letterSpacing: '0.3em', maxWidth: 140 }} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && verifyCode()} placeholder="123456" />
                    <button className="btn primary sm" onClick={verifyCode} disabled={busy === 'verify' || code.length < 6}>{busy === 'verify' ? 'Verifying…' : 'Verify code'}</button>
                  </div>
                </label>
              )}
              <div className="wrap-gap">
                <button className={`btn sm ${sent ? 'ghost' : 'primary'}`} onClick={sendLink} disabled={busy === 'login' || !loginEmail.trim()}>{busy === 'login' ? 'Sending…' : sent ? 'Resend' : 'Send sign-in email'}</button>
                {source === 'settings' && <button className="btn ghost sm" onClick={disconnect}>Disconnect</button>}
              </div>
              {sent && <p className="small muted" style={{ marginTop: 8 }}>The <b>code</b> is the reliable way — links can be consumed by email scanners. If you don’t see a code in the email, add <span className="mono">{'{{ .Token }}'}</span> to your Supabase “Magic Link” email template.</p>}
            </>
          ) : (
            <>
              <div className="kv"><span className="k">Signed in</span><span className="val"><b>{email}</b></span></div>
              <div className="kv"><span className="k">Cloud copy</span><span className="val">{cloudInfo.exists ? `saved ${cloudInfo.updatedAt ? new Date(cloudInfo.updatedAt).toLocaleString() : ''}` : <span className="muted">none yet</span>}</span></div>
              <div className="kv"><span className="k">Auto-sync</span><span className="val"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={autoSync} onChange={toggleAuto} /> save changes automatically</label></span></div>
              <div className="divider" />
              <div className="wrap-gap" style={{ marginBottom: 10 }}>
                <button className="btn primary sm" onClick={doSave} disabled={!!busy}>{busy === 'save' ? 'Saving…' : '⤒ Save to cloud'}</button>
                <button className="btn ghost sm" onClick={doRestore} disabled={!!busy || !cloudInfo.exists}>{busy === 'restore' ? 'Restoring…' : '⤓ Restore'}</button>
                <button className="btn ghost sm" onClick={doShare} disabled={!!busy}>{busy === 'share' ? 'Sharing…' : '🔗 Share this project'}</button>
              </div>
              {shareLink && (
                <div className="kv"><span className="k">Share link</span><span className="val" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="input mono" style={{ fontSize: 11 }} readOnly value={shareLink} onFocus={(e) => e.target.select()} />
                  <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(shareLink)}>Copy</button>
                </span></div>
              )}
              <div className="divider" />
              <div className="wrap-gap">
                <button className="btn ghost sm" onClick={doSignOut}>Sign out</button>
                {source === 'settings' && <button className="btn ghost sm" onClick={disconnect}>Disconnect cloud</button>}
              </div>
            </>
          )}
          {msg && <p className="small" style={{ marginTop: 10, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</p>}
        </div>
      </div>
    </div>
  )
}
