import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'
import { Modal, Field } from '../components/Modal'
import { Markdown } from '../components/Markdown'
import { streamChat, hasKey, getKey, setKey, getModel, setModel, keySource, MODELS, type ChatMessage } from '../lib/openai'
import { systemPrompt, PRESETS } from '../lib/brsReview'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function Review() {
  const { state } = useStore()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [model, setModelState] = useState(getModel())
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function send(text: string) {
    const q = text.trim()
    if (!q || streaming) return
    if (!hasKey()) {
      setKeyDraft('')
      setSettings(true)
      return
    }
    setError(null)
    setInput('')
    const history = messages
    const callMsgs: ChatMessage[] = [systemPrompt(state), ...history, { role: 'user', content: q }]
    setMessages([...history, { role: 'user', content: q }, { role: 'assistant', content: '' }])
    setStreaming(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await streamChat({
        messages: callMsgs,
        model,
        signal: ctrl.signal,
        onToken: (delta) =>
          setMessages((prev) => {
            const copy = prev.slice()
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + delta }
            return copy
          }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError(msg)
        setMessages((prev) => {
          const copy = prev.slice()
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: last.content ? `${last.content}\n\n_⚠ ${msg}_` : `_⚠ ${msg}_` }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  function saveSettings() {
    if (keyDraft.trim()) setKey(keyDraft.trim())
    setModel(model)
    setSettings(false)
  }

  const src = keySource()

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>KNOWLEDGE REVIEW · BRUGADA SYNDROME</Kicker>
            <h1 style={{ marginTop: 12 }}>Knowledge Review</h1>
            <p>A fast, high-yield review of Brugada Syndrome, tied to your project. Powered by OpenAI — responses stream live.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none' }}>
            <span className="pill" title="Model in use"><b>{model}</b></span>
            {messages.length > 0 && <button className="icon-btn" onClick={() => setMessages([])}>Clear</button>}
            <button className="icon-btn" onClick={() => { setKeyDraft(''); setSettings(true) }}>⚙ Settings</button>
          </div>
        </div>
      </div>

      {src === 'none' && (
        <div className="card lg" style={{ marginBottom: 16, borderLeft: '4px solid var(--amber)' }}>
          <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />NO API KEY</div>
          <p className="small" style={{ marginBottom: 12 }}>Add your OpenAI API key to start. It is stored only in this browser (localStorage) and never leaves your machine except in calls to OpenAI.</p>
          <button className="btn primary sm" onClick={() => { setKeyDraft(''); setSettings(true) }}>Add API key</button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />START A REVIEW</div>
          <div className="grid g4" style={{ gap: 12 }}>
            {PRESETS.map((p) => (
              <button key={p.id} className="preset" onClick={() => send(p.prompt)} disabled={streaming}>
                <b>{p.label}</b>
                <span>{p.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="thread">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === 'assistant' ? (
                m.content ? <Markdown text={m.content} /> : <span className="typing">thinking<span>.</span><span>.</span><span>.</span></span>
              ) : (
                m.content
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {/* preset quick-bar + composer */}
      <div className="composer">
        {messages.length > 0 && (
          <div className="preset-bar">
            {PRESETS.map((p) => (
              <button key={p.id} className="chip-btn" onClick={() => send(p.prompt)} disabled={streaming}>{p.label}</button>
            ))}
          </div>
        )}
        <div className="composer-row">
          <textarea
            className="textarea"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Ask a Brugada question, or pick a topic above…  (Enter to send, Shift+Enter for a new line)"
          />
          {streaming ? (
            <button className="btn ghost" onClick={stop}>Stop</button>
          ) : (
            <button className="btn primary" onClick={() => send(input)} disabled={!input.trim()}>Send</button>
          )}
        </div>
        <p className="small" style={{ marginTop: 8 }}>Educational review, not clinical advice — verify against primary sources. Model: {MODELS.find((m) => m.id === model)?.label ?? model}. Key: {src === 'env' ? 'from .env.local' : src === 'settings' ? 'from browser' : 'not set'}.</p>
      </div>

      {settings && (
        <Modal title="OpenAI settings" onClose={() => setSettings(false)}>
          <Field label="API key" hint={src !== 'none' ? `A key is already set (${src === 'env' ? 'from .env.local' : 'from this browser'}). Enter a new one to override.` : 'Stored only in this browser (localStorage).'}>
            <input className="input" type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder={getKey() ? '•••••••••• (set)' : 'sk-…'} autoComplete="off" />
          </Field>
          <Field label="Model">
            <select className="select" value={model} onChange={(e) => setModelState(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <div className="form-actions">
            {src === 'settings' && <button className="icon-btn danger" onClick={() => { setKey(''); setKeyDraft(''); }}>Clear stored key</button>}
            <span className="spacer" />
            <button className="btn ghost" onClick={() => setSettings(false)}>Cancel</button>
            <button className="btn primary" onClick={saveSettings}>Save</button>
          </div>
        </Modal>
      )}
    </>
  )
}
