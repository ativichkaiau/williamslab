import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Supabase cloud client — optional. Configured via env
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) or via the in-app
// Cloud panel (stored in localStorage). Everything degrades to
// pure-offline localStorage when not configured.
// The anon key is a public, RLS-protected key — safe on the client.
// ============================================================

const URL_LS = 'williamslab.supabase.url'
const KEY_LS = 'williamslab.supabase.key'

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
  return url && key ? { url, key } : null
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
export function setCloudConfig(url: string, key: string) {
  try {
    if (url.trim() && key.trim()) {
      localStorage.setItem(URL_LS, url.trim())
      localStorage.setItem(KEY_LS, key.trim())
    } else {
      localStorage.removeItem(URL_LS)
      localStorage.removeItem(KEY_LS)
    }
  } catch {
    /* ignore */
  }
  client = null // force re-create with new config
}

let client: SupabaseClient | null = null
export function getClient(): SupabaseClient | null {
  const c = config()
  if (!c) return null
  // PKCE flow uses ?code= (query) rather than #tokens (hash), so it doesn't
  // collide with HashRouter's own use of the URL fragment.
  if (!client) client = createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: true } })
  return client
}

// ---- auth (passwordless magic link / OTP) ----
export async function signInEmail(email: string): Promise<void> {
  const c = getClient()
  if (!c) throw new Error('Cloud not configured.')
  const { error } = await c.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } })
  if (error) throw error
}
export async function signOut(): Promise<void> {
  await getClient()?.auth.signOut()
}
export async function currentEmail(): Promise<string | null> {
  const c = getClient()
  if (!c) return null
  const { data } = await c.auth.getUser()
  return data.user?.email ?? null
}
export function onAuth(cb: (email: string | null) => void): () => void {
  const c = getClient()
  if (!c) {
    cb(null)
    return () => {}
  }
  const { data } = c.auth.onAuthStateChange((_evt, session) => cb(session?.user?.email ?? null))
  return () => data.subscription.unsubscribe()
}

// ---- whole-state sync ----
export async function loadCloudState(): Promise<unknown | null> {
  const c = getClient()
  if (!c) return null
  const user = (await c.auth.getUser()).data.user
  if (!user) return null
  const { data } = await c.from('user_states').select('state').eq('user_id', user.id).maybeSingle()
  return data?.state ?? null
}
export async function saveCloudState(state: unknown): Promise<void> {
  const c = getClient()
  if (!c) return
  const user = (await c.auth.getUser()).data.user
  if (!user) return
  await c.from('user_states').upsert({ user_id: user.id, state, updated_at: new Date().toISOString() })
}

// ---- share links (public read-only project snapshots) ----
export async function shareProject(name: string, project: unknown): Promise<string> {
  const c = getClient()
  if (!c) throw new Error('Cloud not configured.')
  const user = (await c.auth.getUser()).data.user
  if (!user) throw new Error('Sign in to share.')
  const id = Math.random().toString(36).slice(2, 10)
  const { error } = await c.from('shared_projects').insert({ id, owner: user.id, name, project })
  if (error) throw error
  return id
}
export async function loadSharedProject(id: string): Promise<{ name: string; project: unknown } | null> {
  const c = getClient()
  if (!c) return null
  const { data } = await c.from('shared_projects').select('name,project').eq('id', id).maybeSingle()
  return data ? { name: data.name as string, project: data.project } : null
}
