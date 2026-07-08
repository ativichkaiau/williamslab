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

export interface Usage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

// Approximate list pricing, USD per 1M tokens. Used only for a rough on-screen
// cost estimate — not billing. Update if OpenAI pricing changes.
export const PRICING: Record<string, { in: number; out: number }> = {
  'gpt-5.1-chat-latest': { in: 1.25, out: 10 },
  'gpt-5-mini': { in: 0.25, out: 2 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4.1': { in: 2, out: 8 },
}

export function estimateCost(model: string, u: Usage): number {
  const p = PRICING[model] ?? PRICING['gpt-4o']
  return (u.prompt_tokens / 1e6) * p.in + (u.completion_tokens / 1e6) * p.out
}

export function fmtCost(usd: number): string {
  if (usd < 0.01) return `<$0.01`
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`
}

interface StreamOpts {
  messages: ChatMessage[]
  model?: string
  signal?: AbortSignal
  onToken: (delta: string) => void
  onUsage?: (u: Usage) => void
}

// Streams a chat completion, calling onToken for each content delta.
// Returns the full assembled text. Params are chosen to work across
// gpt-4o and the gpt-5 family (no temperature; max_completion_tokens).
export async function streamChat({ messages, model, signal, onToken, onUsage }: StreamOpts): Promise<string> {
  const key = getKey()
  if (!key) throw new Error('No OpenAI API key set. Open Settings to add one.')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model ?? getModel(),
      stream: true,
      stream_options: { include_usage: true },
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
        if (json?.usage && onUsage) onUsage(json.usage as Usage)
      } catch {
        /* ignore partial/keepalive lines */
      }
    }
  }
  return full
}

// ---- tool calling (non-streaming) ----
// Used by the copilot so it can actually act on the project (add a study, set
// the stage, search PubMed, …). The caller supplies `execute`, which maps a
// tool name + parsed args to a short result string and performs the side effect.

export interface ToolDef {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export interface ToolAction {
  name: string
  args: Record<string, unknown>
  result: string
}

interface ToolChatOpts {
  messages: ChatMessage[]
  model?: string
  tools: ToolDef[]
  execute: (name: string, args: Record<string, unknown>) => Promise<string> | string
  signal?: AbortSignal
  maxRounds?: number
  onUsage?: (u: Usage) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WireMsg = any

export async function chatWithTools({ messages, model, tools, execute, signal, maxRounds = 4, onUsage }: ToolChatOpts): Promise<{ text: string; actions: ToolAction[] }> {
  const key = getKey()
  if (!key) throw new Error('No OpenAI API key set. Open Settings to add one.')
  const msgs: WireMsg[] = [...messages]
  const actions: ToolAction[] = []

  for (let round = 0; round < maxRounds; round++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model ?? getModel(),
        max_completion_tokens: 1400,
        messages: msgs,
        tools,
        tool_choice: 'auto',
      }),
      signal,
    })
    if (!res.ok) {
      let msg = `OpenAI request failed (${res.status})`
      try {
        const j = await res.json()
        if (j?.error?.message) msg = j.error.message
      } catch {
        /* not JSON */
      }
      if (res.status === 401) msg = 'Invalid API key (401). Check it in Settings.'
      throw new Error(msg)
    }
    const j = await res.json()
    if (j?.usage && onUsage) onUsage(j.usage as Usage)
    const m = j?.choices?.[0]?.message
    if (!m) return { text: '', actions }
    msgs.push(m)
    const calls = m.tool_calls as { id: string; function: { name: string; arguments: string } }[] | undefined
    if (calls && calls.length) {
      for (const c of calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(c.function.arguments || '{}')
        } catch {
          /* leave empty */
        }
        let result: string
        try {
          result = await execute(c.function.name, args)
        } catch (e) {
          result = `Error: ${e instanceof Error ? e.message : String(e)}`
        }
        actions.push({ name: c.function.name, args, result })
        msgs.push({ role: 'tool', tool_call_id: c.id, content: result })
      }
      continue
    }
    return { text: m.content ?? '', actions }
  }
  return { text: '_Stopped after the maximum number of tool steps._', actions }
}
