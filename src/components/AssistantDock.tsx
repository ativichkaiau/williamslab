import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Markdown } from './Markdown'
import { streamChat, hasKey, getModel, type ChatMessage } from '../lib/openai'

type Msg = { role: 'user' | 'assistant'; content: string }

const PAGE: Record<string, string> = {
  '/': 'Overview',
  '/pit-wall': 'Dashboard',
  '/hypotheses': 'Hypotheses',
  '/mechanism': 'Mechanism Map',
  '/assays': 'Assays',
  '/radar': 'Literature',
  '/power': 'Statistical Power',
  '/suspension': 'Rigor Monitor',
  '/graph': 'Knowledge Graph',
  '/theory': 'BrS Theory',
  '/review': 'Knowledge Review',
}

export default function AssistantDock() {
  const { state } = useStore()
  const loc = useLocation()
  const page = PAGE[loc.pathname] ?? 'WilliamsLab'

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, open])

  function system(): ChatMessage {
    const hyps = state.hypotheses.map((h) => `- ${h.label}`).join('\n')
    return {
      role: 'system',
      content: `You are the WilliamsLab research copilot, embedded in a Brugada Syndrome research operating system. The user is currently on the "${page}" page.

Project: "${state.project.name}".
Central hypothesis: "${state.project.centralHypothesis}"
Working hypotheses:
${hyps}

Be concise and practical. Use markdown (## headings, **bold**, - bullets). Help with Brugada / cardiac-EP science, epigenetics, study design, statistics, and using this app. This is for research and education, not clinical care.`,
    }
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || streaming) return
    if (!hasKey()) {
      setMessages((m) => [...m, { role: 'assistant', content: '_No OpenAI key set. Add one in **Knowledge Review → Settings** (stored only in your browser)._' }])
      return
    }
    setInput('')
    const history = messages
    const callMsgs: ChatMessage[] = [system(), ...history, { role: 'user', content: q }]
    setMessages([...history, { role: 'user', content: q }, { role: 'assistant', content: '' }])
    setStreaming(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await streamChat({
        messages: callMsgs,
        model: getModel(),
        signal: ctrl.signal,
        onToken: (d) =>
          setMessages((prev) => {
            const copy = prev.slice()
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + d }
            return copy
          }),
      })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        const msg = e instanceof Error ? e.message : 'Request failed'
        setMessages((prev) => {
          const copy = prev.slice()
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content || `_⚠ ${msg}_` }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const suggestions = [
    `Summarize the ${page} page`,
    'Explain the type-1 Brugada ECG',
    'Critique my central hypothesis',
    'What are my biggest study-design risks?',
  ]

  if (!open) {
    return (
      <button className="ai-fab" onClick={() => setOpen(true)} aria-label="Open AI copilot">
        <span className="spark">✦</span> Ask AI
        <span className="rdot" />
      </button>
    )
  }

  return (
    <div className="ai-panel" role="dialog" aria-label="AI copilot">
      <div className="ai-head">
        <div className="avatar">✦</div>
        <div className="t">Research copilot<small>{page} · {getModel()}</small></div>
        <span className="sp" />
        {messages.length > 0 && <button className="ai-x" onClick={() => setMessages([])} title="Clear" style={{ marginRight: 6 }}>⟲</button>}
        <button className="ai-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
      </div>

      <div className="ai-thread">
        {messages.length === 0 ? (
          <div className="ai-empty">
            <b>Ask anything</b> about Brugada Syndrome, your hypotheses, stats, or this page.
            <div className="ai-sugg">
              {suggestions.map((s) => (
                <button key={s} className="chip-btn" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role}`}>
              {m.role === 'assistant' ? (m.content ? <Markdown text={m.content} /> : <span className="typing">…</span>) : m.content}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="ai-foot">
        <textarea
          className="textarea"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask the copilot…"
        />
        {streaming ? (
          <button className="btn ghost sm" onClick={() => abortRef.current?.abort()}>Stop</button>
        ) : (
          <button className="btn primary sm" onClick={() => send(input)} disabled={!input.trim()}>Send</button>
        )}
      </div>
      <div className="ai-note">Educational · verify against primary sources</div>
    </div>
  )
}
