// ============================================================
// OpenAI client — browser-side. The API sends CORS headers for
// api.openai.com, so no backend is needed. The key is read from
// localStorage (in-app Settings) first, then from the build-time
// VITE_OPENAI_API_KEY env var. It is never committed.
// ============================================================

const KEY_LS = 'williamslab.openai.key'
const MODEL_LS = 'williamslab.openai.model'

export const DEFAULT_MODEL = 'gpt-5.1-chat-latest'

export const MODELS: { id: string; label: string }[] = [
  { id: 'gpt-5.1-chat-latest', label: 'GPT-5.1 · highest quality' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini · fast' },
  { id: 'gpt-4o', label: 'GPT-4o · balanced' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini · cheapest' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
]

function envKey(): string {
  try {
    return (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function getKey(): string {
  try {
    const ls = localStorage.getItem(KEY_LS)
    if (ls && ls.trim()) return ls.trim()
  } catch {
    /* ignore */
  }
  return envKey()
}

export function keySource(): 'settings' | 'env' | 'none' {
  try {
    if (localStorage.getItem(KEY_LS)?.trim()) return 'settings'
  } catch {
    /* ignore */
  }
  return envKey() ? 'env' : 'none'
}

export function setKey(k: string): void {
  try {
    if (k.trim()) localStorage.setItem(KEY_LS, k.trim())
    else localStorage.removeItem(KEY_LS)
  } catch {
    /* ignore */
  }
}

export function hasKey(): boolean {
  return getKey().length > 0
}

export function getModel(): string {
  try {
    return localStorage.getItem(MODEL_LS) || DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
}

export function setModel(m: string): void {
  try {
    localStorage.setItem(MODEL_LS, m)
  } catch {
    /* ignore */
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamOpts {
  messages: ChatMessage[]
  model?: string
  signal?: AbortSignal
  onToken: (delta: string) => void
}

// Streams a chat completion, calling onToken for each content delta.
// Returns the full assembled text. Params are chosen to work across
// gpt-4o and the gpt-5 family (no temperature; max_completion_tokens).
export async function streamChat({ messages, model, signal, onToken }: StreamOpts): Promise<string> {
  const key = getKey()
  if (!key) throw new Error('No OpenAI API key set. Open Settings to add one.')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model ?? getModel(),
      stream: true,
      max_completion_tokens: 2000,
      messages,
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    let msg = `OpenAI request failed (${res.status})`
    try {
      const j = await res.json()
      if (j?.error?.message) msg = j.error.message
    } catch {
      /* body not JSON */
    }
    if (res.status === 401) msg = 'Invalid API key (401). Check it in Settings.'
    else if (res.status === 429) msg = 'Rate limit or quota exceeded (429). Try again shortly.'
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const data = t.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const delta: string | undefined = json?.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          onToken(delta)
        }
      } catch {
        /* ignore partial/keepalive lines */
      }
    }
  }
  return full
}
