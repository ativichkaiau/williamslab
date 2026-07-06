import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, SevDot } from '../components/ui'
import { Markdown } from '../components/Markdown'
import { INSTABILITY_LABEL, SEVERITY_COLOR } from '../lib/palette'
import { streamChat, hasKey, getModel, type ChatMessage } from '../lib/openai'
import type { Severity } from '../types'

function sevRank(s: Severity) {
  return s === 'high' ? 3 : s === 'med' ? 2 : 1
}

export default function Suspension() {
  const { state, instabilities, stability, setInstabilityStatus, setPreRegistered, setPrimaryEndpoint } = useStore()
  const sorted = [...instabilities].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    return sevRank(b.severity) - sevRank(a.severity)
  })
  const open = instabilities.filter((i) => i.status === 'open').length
  const gaugeCol = stability >= 0.75 ? SEVERITY_COLOR.low : stability >= 0.5 ? SEVERITY_COLOR.med : SEVERITY_COLOR.high

  // ---- AI reviewer ----
  const [aiText, setAiText] = useState('')
  const [aiStreaming, setAiStreaming] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function aiReview() {
    if (aiStreaming) return
    if (!hasKey()) {
      setAiError('No OpenAI key set — add one in Knowledge Review → Settings.')
      return
    }
    setAiError(null)
    setAiText('')
    setAiStreaming(true)
    const findings = instabilities
      .filter((i) => i.status === 'open')
      .map((i) => `- [${i.severity}] ${INSTABILITY_LABEL[i.type]} (${i.targetLabel}): ${i.comment}`)
      .join('\n')
    const assays = state.assays.map((a) => `${a.method} · n=${a.sampleN ?? '?'} · ${a.controls || 'no controls'} · ${a.status}`).join('; ')
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a rigorous methods reviewer for a translational cardiac-EP / epigenetics study. Give actual, specific, constructive review comments — like a study-section critique. Use markdown: a short overall read, then the 3 highest-priority issues with concrete fixes, then anything the automated checks missed. Be blunt but useful; no filler.',
      },
      {
        role: 'user',
        content: `Project: ${state.project.name}\nCentral hypothesis: ${state.project.centralHypothesis}\n\nHypotheses:\n${state.hypotheses
          .map((h) => `- ${h.label}: ${h.statement}`)
          .join('\n')}\n\nAssays: ${assays}\n\nPre-registered: ${state.project.preRegistered}; primary endpoint: ${state.project.primaryEndpoint ?? 'none'}\n\nAutomated rigor findings:\n${findings || 'none'}\n\nReview the design.`,
      },
    ]
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await streamChat({ messages, model: getModel(), signal: ctrl.signal, onToken: (d) => setAiText((t) => t + d) })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setAiError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setAiStreaming(false)
      abortRef.current = null
    }
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>RIGOR MONITOR · STUDY-DESIGN INTEGRITY</Kicker>
            <h1 style={{ marginTop: 12 }}>Rigor Monitor</h1>
            <p>Nine automated checks read the actual project data and write a specific comment on each weakness. Fix an issue — or clear one live below — and the rigor score recovers. For a holistic critique, run an AI review.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none' }}>
            <button className="btn primary sm" onClick={aiReview} disabled={aiStreaming}>{aiStreaming ? 'Reviewing…' : '✦ AI review'}</button>
          </div>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat">
          <b style={{ color: gaugeCol }}>{Math.round(stability * 100)}%</b>
          <span>Rigor score</span>
          <div className="sub">{open} open · {instabilities.length - open} handled</div>
        </div>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />QUICK FIXES · STATISTICAL STRATEGY</div>
          <label className="flex" style={{ cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={state.project.preRegistered} onChange={(e) => setPreRegistered(e.target.checked)} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Pre-register the analysis plan</span>
          </label>
          <div className="kv" style={{ alignItems: 'center' }}>
            <span className="k">Primary EP</span>
            <input className="input" style={{ minWidth: 260, flex: 1 }} placeholder="e.g. SCN5A-promoter methylation index (pyroseq)" value={state.project.primaryEndpoint ?? ''} onChange={(e) => setPrimaryEndpoint(e.target.value || undefined)} />
          </div>
          <p className="small" style={{ marginTop: 8 }}>Set both and the <b>statistical-ambiguity</b> finding clears itself — the check reads real project state.</p>
        </div>
      </div>

      {(aiText || aiStreaming || aiError) && (
        <div className="card lg" style={{ marginBottom: 16, borderLeft: '4px solid var(--blue)' }}>
          <div className="card-h" style={{ justifyContent: 'space-between' }}>
            <span><span className="sq" style={{ background: 'var(--blue)' }} />AI REVIEW · {getModel()}</span>
            {aiStreaming ? <button className="icon-btn" onClick={() => abortRef.current?.abort()}>Stop</button> : <button className="icon-btn" onClick={() => setAiText('')}>Dismiss</button>}
          </div>
          {aiError && <div className="err">{aiError}</div>}
          {aiText ? <Markdown text={aiText} /> : aiStreaming && <span className="typing">reviewing<span>.</span><span>.</span><span>.</span></span>}
        </div>
      )}

      <div className="findings">
        {sorted.map((i) => (
          <div className="finding" key={i.id} style={{ borderLeftColor: SEVERITY_COLOR[i.severity], opacity: i.status !== 'open' ? 0.5 : 1 }}>
            <div className="finding-top">
              <SevDot severity={i.severity} label={INSTABILITY_LABEL[i.type]} />
              <span className="finding-target mono">{i.targetLabel ?? i.target}</span>
              <span className="spacer" />
              {i.status === 'open' ? (
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => setInstabilityStatus(i.id, 'acknowledged')}>Ack</button>
                  <button className="icon-btn" onClick={() => setInstabilityStatus(i.id, 'resolved')}>Resolve</button>
                </div>
              ) : (
                <div className="row-actions">
                  <span className="badge b-done">{i.status}</span>
                  <button className="icon-btn" onClick={() => setInstabilityStatus(i.id, 'open')}>Reopen</button>
                </div>
              )}
            </div>
            <p className="finding-comment">{i.comment}</p>
            <p className="finding-fix"><span className="fix-l">Fix</span> {i.repair}</p>
          </div>
        ))}
      </div>
    </>
  )
}
