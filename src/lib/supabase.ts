import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Supabase cloud client — optional & bring-your-own. Configured via env
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) or the in-app Cloud panel
// (stored in localStorage). Everything degrades to pure-offline localStorage
// when not configured. The anon key is a PUBLIC, RLS-protected key — safe on
// the client; the service_role secret must never be used here.
// ============================================================

const URL_LS = 'williamslab.supabase.url'
const KEY_LS = 'williamslab.supabase.key'

// the local stores that make up a user's workspace (kept in sync as one blob)
const APP_KEY = 'williamslab.app.v2'
const LITLINK_KEY = 'williamslab.litlink'

function env(k: string): string {
  try {
    return ((import.meta.env as Record<string, string | undefined>)[k] ?? '').trim()
  } catch {
    return ''
  }
}

function config(): { url: string; key: string } | null {
  let url = ''
  let key = ''
  try {
    url = localStorage.getItem(URL_LS) || ''
    key = localStorage.getItem(KEY_LS) || ''
  } catch {
    /* ignore */
  }
  url = url || env('VITE_SUPABASE_URL')
  key = key || env('VITE_SUPABASE_ANON_KEY')
  // Always use the bare origin — a stray path segment makes the API gateway
  // reject requests with "Invalid path specified in request URL".
  if (url) {
    try {
      url = new URL(url.startsWith('http') ? url : `https://${url}`).origin
    } catch {
      /* leave as-is; setCloudConfig validates on entry */
    }
  }
  return url && key ? { url, key } : null
}

// Validate + normalise a project URL. Returns an error string, or the clean
// origin. Catches the two common mistakes: a pasted path, and the dashboard URL.
export function normalizeSupabaseUrl(raw: string): { origin?: string; error?: string } {
  const t = raw.trim()
  if (!t) return { error: 'Enter your Supabase project URL.' }
  let u: URL
  try {
    u = new URL(t.startsWith('http') ? t : `https://${t}`)
  } catch {
    return { error: 'That does not look like a valid URL.' }
  }
  if (u.hostname === 'supabase.com' || u.hostname.includes('dashboard')) {
    return { error: 'That is the dashboard URL. Use the Project URL from Settings → API — it looks like https://<ref>.supabase.co' }
  }
  return { origin: u.origin }
}

export function isCloudConfigured(): boolean {
  return !!config()
}
export function cloudConfigSource(): 'settings' | 'env' | 'none' {
  try {
    if (localStorage.getItem(URL_LS) && localStorage.getItem(KEY_LS)) return 'settings'
  } catch {
    /* ignore */
  }
  return env('VITE_SUPABASE_URL') && env('VITE_SUPABASE_ANON_KEY') ? 'env' : 'none'
}
// Returns an error message if the config is rejected, else null (and saves it).
export function setCloudConfig(url: string, key: string): string | null {
  const k = key.trim()
  const raw = url.trim()
  clientPromise = null // force re-create with new config
  if (!raw && !k) {
    try { localStorage.removeItem(URL_LS); localStorage.removeItem(KEY_LS) } catch { /* ignore */ }
    return null
  }
  if (!raw || !k) return 'Enter both the project URL and the anon key.'
  const { origin, error } = normalizeSupabaseUrl(raw)
  if (error) return error
  if (/^sb_secret_/i.test(k) || k.length < 20) return 'That key looks wrong — use the anon public key (Settings → API), never the service_role / secret key.'
  try {
    localStorage.setItem(URL_LS, origin!)
    localStorage.setItem(KEY_LS, k)
  } catch {
    /* ignore */
  }
  return null
}

// supabase-js is ~130 kB gzipped — lazy-load it only when cloud is actually
// configured, so it never touches the main bundle for offline-only users.
let clientPromise: Promise<SupabaseClient | null> | null = null
async function loadClient(): Promise<SupabaseClient | null> {
  const c = config()
  if (!c) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      // PKCE flow uses ?code= (query) not #tokens (hash), so it doesn't collide
      // with HashRouter's use of the URL fragment.
      createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: true } }),
    )
  }
  return clientPromise
}

// ---- auth (passwordless magic link / OTP) ----
export async function signInEmail(email: string): Promise<void> {
  const c = await loadClient()
  if (!c) throw new Error('Cloud not configured.')
  const { error } = await c.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin + location.pathname } })
  if (error) throw error
}
// Verify the 6-digit code from the email — immune to link prefetching / expiry.
export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const c = await loadClient()
  if (!c) throw new Error('Cloud not configured.')
  const { error } = await c.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' })
  if (error) throw error
}
// Password auth — no email at all (disable "Confirm email" in Supabase so
// sign-up needs no confirmation link). Sidesteps the built-in email rate limit.
export async function signInPassword(email: string, password: string): Promise<void> {
  const c = await loadClient()
  if (!c) throw new Error('Cloud not configured.')
  const { error } = await c.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}
export async function signUpPassword(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  const c = await loadClient()
  if (!c) throw new Error('Cloud not configured.')
  const { data, error } = await c.auth.signUp({ email: email.trim(), password })
  if (error) throw error
  return { needsConfirm: !data.session } // no immediate session ⇒ email confirmation is on
}
export async function signOut(): Promise<void> {
  await (await loadClient())?.auth.signOut()
}
export async function currentEmail(): Promise<string | null> {
  const c = await loadClient()
  if (!c) return null
  const { data } = await c.auth.getUser()
  return data.user?.email ?? null
}
export function onAuth(cb: (email: string | null) => void): () => void {
  let unsub = () => {}
  let cancelled = false
  loadClient().then((c) => {
    if (cancelled) return
    if (!c) { cb(null); return }
    const { data } = c.auth.onAuthStateChange((_evt, session) => cb(session?.user?.email ?? null))
    unsub = () => data.subscription.unsubscribe()
  })
  return () => { cancelled = true; unsub() }
}

// ---- the workspace bundle (app store + litlink store) ----
export interface Bundle {
  v: number
  app: unknown | null
  litlink: unknown | null
}
function readLocalBundle(): Bundle {
  const parse = (k: string) => {
    try {
      const raw = localStorage.getItem(k)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  return { v: 1, app: parse(APP_KEY), litlink: parse(LITLINK_KEY) }
}
function writeLocalBundle(b: Bundle) {
  try {
    if (b.app) localStorage.setItem(APP_KEY, JSON.stringify(b.app))
    if (b.litlink) localStorage.setItem(LITLINK_KEY, JSON.stringify(b.litlink))
    else localStorage.removeItem(LITLINK_KEY)
  } catch {
    /* ignore quota */
  }
}

// ---- whole-workspace sync (one JSON blob per user) ----
export async function saveCloudState(): Promise<void> {
  const c = await loadClient()
  if (!c) return
  const user = (await c.auth.getUser()).data.user
  if (!user) return
  const { error } = await c.from('user_states').upsert({ user_id: user.id, state: readLocalBundle(), updated_at: new Date().toISOString() })
  if (error) throw error
}
export async function cloudStateInfo(): Promise<{ exists: boolean; updatedAt?: string }> {
  const c = await loadClient()
  if (!c) return { exists: false }
  const user = (await c.auth.getUser()).data.user
  if (!user) return { exists: false }
  const { data } = await c.from('user_states').select('updated_at').eq('user_id', user.id).maybeSingle()
  return { exists: !!data, updatedAt: data?.updated_at as string | undefined }
}
// Pull the cloud workspace into local storage. Returns false if nothing to pull.
export async function restoreCloudState(): Promise<boolean> {
  const c = await loadClient()
  if (!c) return false
  const user = (await c.auth.getUser()).data.user
  if (!user) return false
  const { data } = await c.from('user_states').select('state').eq('user_id', user.id).maybeSingle()
  const bundle = data?.state as Bundle | undefined
  if (!bundle || !bundle.app) return false
  writeLocalBundle(bundle)
  return true
}

// ---- share links (public read-only project snapshots) ----
export async function shareProject(name: string, project: unknown): Promise<string> {
  const c = await loadClient()
  if (!c) throw new Error('Cloud not configured.')
  const user = (await c.auth.getUser()).data.user
  if (!user) throw new Error('Sign in to share.')
  const id = Math.random().toString(36).slice(2, 10)
  const { error } = await c.from('shared_projects').insert({ id, owner: user.id, name, project })
  if (error) throw error
  return id
}
export async function loadSharedProject(id: string): Promise<{ name: string; project: unknown } | null> {
  const c = await loadClient()
  if (!c) return null
  const { data } = await c.from('shared_projects').select('name,project').eq('id', id).maybeSingle()
  return data ? { name: data.name as string, project: data.project } : null
}
