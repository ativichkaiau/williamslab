import { useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, StatCard } from '../components/ui'
import { Markdown } from '../components/Markdown'
import { ForestPlot, FunnelPlot } from '../components/srmaPlots'
import { computeMeta, fmt } from '../lib/metaAnalysis'
import { streamChat, hasKey, getModel, type ChatMessage } from '../lib/openai'

export default function MetaAnalysis() {
  const { state, updateReview } = useStore()
  const r = state.review
  const meta = useMemo(() => computeMeta(r.studies, r.model), [r.studies, r.model])
  const totalEvents = meta.rows.reduce((a, x) => a + x.expEvents + x.ctrlEvents, 0)
  const totalN = meta.rows.reduce((a, x) => a + x.expTotal + x.ctrlTotal, 0)
  const sig = meta.k > 0 && (meta.pooledLow > 1 || meta.pooledHigh < 1)

  const [aiText, setAiText] = useState('')
  const [aiOn, setAiOn] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  async function draft() {
    if (aiOn) return
    if (!hasKey()) { setAiText('_Set an OpenAI key in Knowledge Review → Settings._'); return }
    setAiText(''); setAiOn(true)
    const studies = meta.rows.map((x) => `${x.label}: OR ${fmt(x.or)} [${fmt(x.low)}, ${fmt(x.high)}], weight ${fmt(x.weight, 1)}%`).join('; ')
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a medical writer drafting the Results section of a systematic review & meta-analysis. Write one tight, publication-style paragraph in past tense with the pooled estimate, CI, heterogeneity (I², τ²), and a one-line interpretation. Use markdown. No preamble.' },
      { role: 'user', content: `Question: ${r.question}\nModel: ${r.model}-effects, ${r.effect}, ${r.indexLabel} vs ${r.comparatorLabel}, outcome ${r.outcomeLabel}.\nStudies (k=${meta.k}): ${studies}\nPooled ${r.effect} ${fmt(meta.pooledOR)} [${fmt(meta.pooledLow)}, ${fmt(meta.pooledHigh)}]; Q=${fmt(meta.Q)}, df=${meta.df}, I²=${fmt(meta.I2, 0)}%, τ²=${fmt(meta.tau2, 3)}, p(het)=${fmt(meta.pValue, 3)}.` },
    ]
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      await streamChat({ messages, model: getModel(), signal: ctrl.signal, onToken: (d) => setAiText((t) => t + d) })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setAiText((t) => t + `\n\n_⚠ ${e instanceof Error ? e.message : 'failed'}_`)
    } finally { setAiOn(false); abortRef.current = null }
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>SYSTEMATIC REVIEW · META-ANALYSIS</Kicker>
            <h1 style={{ marginTop: 12 }}>Meta-analysis</h1>
            <p>{r.indexLabel} vs {r.comparatorLabel} → {r.outcomeLabel}. Inverse-variance pooling with heterogeneity statistics.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none' }}>
            <div className="seg">
              <button className={`seg-b${r.model === 'random' ? ' on' : ''}`} onClick={() => updateReview({ model: 'random' })}>Random</button>
              <button className={`seg-b${r.model === 'fixed' ? ' on' : ''}`} onClick={() => updateReview({ model: 'fixed' })}>Fixed</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard value={`${fmt(meta.pooledOR)}`} label={`Pooled ${r.effect}`} sub={`[${fmt(meta.pooledLow)}, ${fmt(meta.pooledHigh)}]`} tone={sig ? '#e2001a' : '#5b6480'} />
        <StatCard value={`${fmt(meta.I2, 0)}%`} label="I² heterogeneity" sub={`τ²=${fmt(meta.tau2, 3)}`} tone="#f59e0b" />
        <StatCard value={meta.k} label="Studies pooled" sub={`${r.studies.length - meta.k} excluded`} tone="#7c3aed" />
        <StatCard value={totalEvents} label="Events" sub={`of ${totalN} patients`} tone="#12b981" />
      </div>

      <div className="card lg" style={{ marginBottom: 16 }}>
        <div className="card-h"><span className="sq" style={{ background: 'var(--accent, var(--blue))' }} />FOREST PLOT</div>
        <ForestPlot result={meta} index={r.indexLabel} comparator={r.comparatorLabel} measure={r.effect} />
      </div>

      <div className="grid g2">
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />HETEROGENEITY</div>
          <div className="kv"><span className="k">Pooled {r.effect}</span><span className="val"><b>{fmt(meta.pooledOR)}</b> [{fmt(meta.pooledLow)}, {fmt(meta.pooledHigh)}] · {r.model}-effects</span></div>
          <div className="kv"><span className="k">Cochran's Q</span><span className="val">{fmt(meta.Q)} (df = {meta.df}), p = {fmt(meta.pValue, 3)}</span></div>
          <div className="kv"><span className="k">I²</span><span className="val">{fmt(meta.I2, 0)}% — {meta.I2 < 25 ? 'low' : meta.I2 < 60 ? 'moderate' : 'substantial'} heterogeneity</span></div>
          <div className="kv"><span className="k">τ²</span><span className="val">{fmt(meta.tau2, 3)}</span></div>
          <div className="divider" />
          <p className="small">{sig ? <>The association is <b style={{ color: 'var(--red)' }}>statistically significant</b> (CI excludes 1).</> : <>The pooled estimate is <b>not significant</b> (CI crosses 1).</>}</p>
        </div>

        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />FUNNEL PLOT · small-study effects</div>
          <FunnelPlot result={meta} />
        </div>
      </div>

      <div className="card lg" style={{ marginTop: 16, borderLeft: '4px solid var(--accent, var(--blue))' }}>
        <div className="card-h" style={{ justifyContent: 'space-between' }}>
          <span><span className="sq" style={{ background: 'var(--accent, var(--blue))' }} />RESULTS PARAGRAPH · AI DRAFT</span>
          {aiOn ? <button className="icon-btn" onClick={() => abortRef.current?.abort()}>Stop</button> : <button className="btn primary sm" onClick={draft}>✦ Draft</button>}
        </div>
        {aiText ? <Markdown text={aiText} /> : <p className="small">Draft a publication-style results paragraph from the pooled estimate and heterogeneity.</p>}
      </div>
    </>
  )
}
