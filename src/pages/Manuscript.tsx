import { useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'
import { Markdown } from '../components/Markdown'
import { ForestPlot, FunnelPlot, PrismaFlow } from '../components/srmaPlots'
import { computeMeta, eggersTest, leaveOneOut } from '../lib/metaAnalysis'
import { buildMarkdown, EXPORT_CSS } from '../lib/manuscript'
import { streamChat, hasKey, getModel, type ChatMessage } from '../lib/openai'

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function Manuscript() {
  const { state } = useStore()
  const r = state.review
  const meta = useMemo(() => computeMeta(r.studies, r.model), [r.studies, r.model])
  const egger = useMemo(() => eggersTest(r.studies), [r.studies])
  const loo = useMemo(() => leaveOneOut(r.studies, r.model), [r.studies, r.model])
  const md = useMemo(() => buildMarkdown(state, meta, egger, loo), [state, meta, egger, loo])

  const splitIdx = md.indexOf('## PRISMA 2020 checklist')
  const narrative = (splitIdx >= 0 ? md.slice(0, splitIdx) : md).replace(/^#\s.*\n+/, '')
  const checklistMd = splitIdx >= 0 ? md.slice(splitIdx) : ''
  const slug = r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const [copied, setCopied] = useState(false)

  function downloadHtml() {
    const inner = previewRef.current?.innerHTML ?? ''
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${r.title}</title><style>${EXPORT_CSS}</style></head><body>${inner}</body></html>`
    download(html, `${slug}.html`, 'text/html')
  }

  // AI polish
  const [aiText, setAiText] = useState('')
  const [aiOn, setAiOn] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  async function polish() {
    if (aiOn) return
    if (!hasKey()) { setAiText('_Set an OpenAI key in Knowledge Review → Settings._'); return }
    setAiText(''); setAiOn(true)
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a medical editor. Expand and polish the Abstract and Discussion of this systematic review into publication-ready prose (accurate to the numbers given, cautious about causal language, past tense). Return markdown with ## Abstract and ## Discussion only.' },
      { role: 'user', content: md.slice(0, 3500) },
    ]
    const ctrl = new AbortController(); abortRef.current = ctrl
    try { await streamChat({ messages, model: getModel(), signal: ctrl.signal, onToken: (d) => setAiText((t) => t + d) }) }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setAiText((t) => t + `\n\n_⚠ ${e instanceof Error ? e.message : 'failed'}_`) }
    finally { setAiOn(false); abortRef.current = null }
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>SYSTEMATIC REVIEW · MANUSCRIPT</Kicker>
            <h1 style={{ marginTop: 12 }}>Manuscript &amp; PRISMA export</h1>
            <p>A submission-ready draft — Methods, Results, figures and the PRISMA 2020 checklist — assembled from your review. Verify every number and the narrative before submitting.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn primary sm" onClick={downloadHtml}>⤓ HTML (with figures)</button>
            <button className="btn ghost sm" onClick={() => download(md, `${slug}.md`, 'text/markdown')}>⤓ Markdown</button>
            <button className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? 'Copied ✓' : 'Copy'}</button>
            {aiOn ? <button className="btn ghost sm" onClick={() => abortRef.current?.abort()}>Stop</button> : <button className="btn ghost sm" onClick={polish}>✦ AI polish</button>}
          </div>
        </div>
      </div>

      {aiText && (
        <div className="card lg" style={{ marginBottom: 16, borderLeft: '4px solid var(--accent, var(--blue))' }}>
          <div className="card-h"><span className="sq" style={{ background: 'var(--accent, var(--blue))' }} />AI-POLISHED ABSTRACT &amp; DISCUSSION</div>
          <Markdown text={aiText} />
        </div>
      )}

      <div className="card lg">
        <div className="manuscript" ref={previewRef}>
          <h1>{r.title}</h1>
          <Markdown text={narrative} />
          <div className="fig-cap">Figure 1. PRISMA 2020 flow diagram.</div>
          <figure><PrismaFlow prisma={r.prisma} /></figure>
          <div className="fig-cap">Figure 2. Forest plot of the pooled {r.effect}.</div>
          <figure><ForestPlot result={meta} index={r.indexLabel} comparator={r.comparatorLabel} measure={r.effect} /></figure>
          <div className="fig-cap">Figure 3. Funnel plot.</div>
          <figure><FunnelPlot result={meta} /></figure>
          <Markdown text={checklistMd} />
        </div>
      </div>
    </>
  )
}
