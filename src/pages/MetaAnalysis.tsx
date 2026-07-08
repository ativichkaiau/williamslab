import { useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, StatCard } from '../components/ui'
import { Markdown } from '../components/Markdown'
import { ForestPlot, FunnelPlot } from '../components/srmaPlots'
import { FigureFrame } from '../components/FigureFrame'
import { computeMeta, leaveOneOut, subgroupAnalysis, eggersTest, computeGrade, trimAndFill, measureInfo, MEASURES, fmt } from '../lib/metaAnalysis'
import { streamChat, hasKey, getModel, type ChatMessage } from '../lib/openai'
import type { Study, EffectMeasure } from '../types'

const GROUPINGS: Record<string, { label: string; key: (s: Study) => string }> = {
  period: { label: 'Publication period', key: (s) => (s.year < 2018 ? 'Before 2018' : '2018 onwards') },
  design: { label: 'Study design', key: (s) => s.design ?? '—' },
  robSel: { label: 'Selection risk of bias', key: (s) => (s.rob?.Selection === 'low' ? 'Low RoB' : 'Some / high RoB') },
  custom: { label: 'Custom subgroup', key: (s) => s.subgroup ?? '—' },
}
const CERT: Record<string, string> = { High: '#12b981', Moderate: '#1746d1', Low: '#f59e0b', 'Very low': '#e2001a' }

export default function MetaAnalysis() {
  const { state, updateReview } = useStore()
  const r = state.review
  const meta = useMemo(() => computeMeta(r.studies, r.model, r.effect), [r.studies, r.model, r.effect])
  const [groupBy, setGroupBy] = useState<keyof typeof GROUPINGS>('period')
  const sub = useMemo(() => subgroupAnalysis(r.studies, r.model, r.effect, GROUPINGS[groupBy].key), [r.studies, r.model, r.effect, groupBy])
  const loo = useMemo(() => leaveOneOut(r.studies, r.model, r.effect), [r.studies, r.model, r.effect])
  const egger = useMemo(() => eggersTest(r.studies, r.effect), [r.studies, r.effect])
  const tf = useMemo(() => trimAndFill(r.studies, r.model, r.effect), [r.studies, r.model, r.effect])
  const grade = useMemo(() => computeGrade(r, meta, egger), [r, meta, egger])
  const looRange = loo.length ? { min: Math.min(...loo.map((x) => x.est)), max: Math.max(...loo.map((x) => x.est)) } : null

  const binary = measureInfo(r.effect).binary
  const totalEvents = meta.rows.reduce((a, x) => a + x.expEvents + x.ctrlEvents, 0)
  const totalN = meta.rows.reduce((a, x) => a + x.expTotal + x.ctrlTotal, 0)
  const sig = meta.k > 0 && (meta.pooledLow > meta.refValue || meta.pooledHigh < meta.refValue)
  const setGrade = (patch: Record<string, string>) => updateReview({ grade: { design: r.grade?.design ?? 'observational', ...(r.grade || {}), ...patch } as typeof r.grade })

  const [aiText, setAiText] = useState('')
  const [aiOn, setAiOn] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  async function draft() {
    if (aiOn) return
    if (!hasKey()) { setAiText('_Set an OpenAI key in Knowledge Review → Settings._'); return }
    setAiText(''); setAiOn(true)
    const studies = meta.rows.map((x) => `${x.label}: ${r.effect} ${fmt(x.est)} [${fmt(x.low)}, ${fmt(x.high)}], weight ${fmt(x.weight, 1)}%`).join('; ')
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a medical writer drafting the Results section of a systematic review & meta-analysis. Write one tight, publication-style paragraph in past tense with the pooled estimate, CI, heterogeneity (I², τ²), and a one-line interpretation. Use markdown. No preamble.' },
      { role: 'user', content: `Question: ${r.question}\nModel: ${r.model}-effects, ${r.effect}, ${r.indexLabel} vs ${r.comparatorLabel}, outcome ${r.outcomeLabel}.\nStudies (k=${meta.k}): ${studies}\nPooled ${r.effect} ${fmt(meta.pooledEst)} [${fmt(meta.pooledLow)}, ${fmt(meta.pooledHigh)}]; Q=${fmt(meta.Q)}, df=${meta.df}, I²=${fmt(meta.I2, 0)}%, τ²=${fmt(meta.tau2, 3)}, p(het)=${fmt(meta.pValue, 3)}. GRADE certainty: ${grade.certainty}.` },
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
            <Kicker>SYSTEMATIC REVIEW · META-ANALYSIS</Kicker>
            <h1 style={{ marginTop: 12 }}>Meta-analysis</h1>
            <p>{r.indexLabel} vs {r.comparatorLabel} → {r.outcomeLabel}. Inverse-variance pooling with heterogeneity, subgroup, sensitivity, publication-bias and GRADE.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <select className="select" style={{ width: 175 }} value={r.effect} onChange={(e) => updateReview({ effect: e.target.value as EffectMeasure })}>
              {MEASURES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <div className="seg">
              <button className={`seg-b${r.model === 'random' ? ' on' : ''}`} onClick={() => updateReview({ model: 'random' })}>Random</button>
              <button className={`seg-b${r.model === 'fixed' ? ' on' : ''}`} onClick={() => updateReview({ model: 'fixed' })}>Fixed</button>
            </div>
          </div>
        </div>
      </div>

      {meta.k === 0 && <div className="err" style={{ background: 'var(--warn)', color: 'var(--warn-ink)', border: '1px solid color-mix(in srgb,var(--amber) 30%,var(--line))', marginBottom: 16 }}>No studies have usable data for <b>{measureInfo(r.effect).label}</b>. {binary ? 'Add 2×2 event counts' : 'Add mean / SD / n per group'} on the Studies page.</div>}

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard value={`${fmt(meta.pooledEst)}`} label={`Pooled ${r.effect}`} sub={`[${fmt(meta.pooledLow)}, ${fmt(meta.pooledHigh)}]`} tone={sig ? '#e2001a' : '#5b6480'} />
        <StatCard value={`${fmt(meta.I2, 0)}%`} label="I² heterogeneity" sub={`τ²=${fmt(meta.tau2, 3)}`} tone="#f59e0b" />
        <StatCard value={meta.k} label="Studies pooled" sub={`${r.studies.length - meta.k} not pooled`} tone="#7c3aed" />
        <StatCard value={binary ? totalEvents : totalN} label={binary ? 'Events' : 'Participants'} sub={binary ? `of ${totalN} patients` : `${meta.k} studies`} tone="#12b981" />
      </div>

      <div className="card lg" style={{ marginBottom: 16 }}>
        <div className="card-h"><span className="sq" style={{ background: 'var(--accent, var(--blue))' }} />FOREST PLOT · {measureInfo(r.effect).label}</div>
        <FigureFrame name="forest-plot">
          <ForestPlot result={meta} index={r.indexLabel} comparator={r.comparatorLabel} measure={r.effect} />
        </FigureFrame>
      </div>

      <div className="grid g2">
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />HETEROGENEITY</div>
          <div className="kv"><span className="k">Pooled {r.effect}</span><span className="val"><b>{fmt(meta.pooledEst)}</b> [{fmt(meta.pooledLow)}, {fmt(meta.pooledHigh)}] · {r.model}-effects</span></div>
          <div className="kv"><span className="k">Cochran's Q</span><span className="val">{fmt(meta.Q)} (df = {meta.df}), p = {fmt(meta.pValue, 3)}</span></div>
          <div className="kv"><span className="k">I²</span><span className="val">{fmt(meta.I2, 0)}% — {meta.I2 < 25 ? 'low' : meta.I2 < 60 ? 'moderate' : 'substantial'} heterogeneity</span></div>
          <div className="kv"><span className="k">τ²</span><span className="val">{fmt(meta.tau2, 3)}</span></div>
          <div className="divider" />
          <p className="small">{sig ? <>The effect is <b style={{ color: 'var(--red)' }}>statistically significant</b> (CI excludes {meta.refValue}).</> : <>The pooled estimate is <b>not significant</b> (CI crosses {meta.refValue}).</>}</p>
        </div>
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />FUNNEL PLOT · contour-enhanced + trim-and-fill</div>
          <FigureFrame name="funnel-plot">
            <FunnelPlot result={meta} imputed={tf.imputed} adjustedPool={tf.adjustedPool} />
          </FigureFrame>
          <p className="small" style={{ marginTop: 8 }}>
            {tf.k0 > 0 ? <>Trim-and-fill imputed <b>{tf.k0}</b> potentially missing stud{tf.k0 > 1 ? 'ies' : 'y'} on the <b>{tf.fillSide}</b>; adjusted {r.effect} <b style={{ color: 'var(--green)' }}>{fmt(tf.adjustedEst)}</b> [{fmt(tf.adjustedLow)}, {fmt(tf.adjustedHigh)}] vs observed {fmt(tf.origEst)}. Studies in the shaded bands are statistically significant.</> : <>Trim-and-fill imputed <b>no</b> missing studies — the funnel is symmetric. Studies in the shaded bands are statistically significant.</>}
          </p>
        </div>
      </div>

      <div className="card lg" style={{ marginTop: 16 }}>
        <div className="card-h" style={{ justifyContent: 'space-between' }}>
          <span><span className="sq" style={{ background: 'var(--violet)' }} />SUBGROUP ANALYSIS</span>
          <select className="select" style={{ width: 210 }} value={groupBy} onChange={(e) => setGroupBy(e.target.value as keyof typeof GROUPINGS)}>
            {Object.entries(GROUPINGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="tbl-scroll" style={{ border: 'none', boxShadow: 'none' }}>
          <table>
            <thead><tr><th>Subgroup</th><th>k</th><th>Pooled {r.effect} [95% CI]</th><th>I²</th></tr></thead>
            <tbody>{sub.groups.map((g) => <tr key={g.name}><td><b>{g.name}</b></td><td className="mono">{g.k}</td><td className="mono">{fmt(g.est)} [{fmt(g.low)}, {fmt(g.high)}]</td><td className="mono">{fmt(g.I2, 0)}%</td></tr>)}</tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10 }}>Test for subgroup differences: Q<sub>between</sub> = {fmt(sub.Qbetween)} (df = {sub.dfBetween}), <b>p = {fmt(sub.pBetween, 3)}</b> — {sub.pBetween < 0.05 ? 'subgroups differ significantly' : 'no significant difference between subgroups'}.</p>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />SENSITIVITY · LEAVE-ONE-OUT</div>
          {loo.length === 0 ? <p className="empty">Needs ≥3 pooled studies.</p> : (
            <>
              <div className="tbl-scroll" style={{ border: 'none', boxShadow: 'none' }}>
                <table><thead><tr><th>Omitting</th><th>Pooled {r.effect} [95% CI]</th></tr></thead><tbody>{loo.map((x) => <tr key={x.excluded}><td>{x.excluded}</td><td className="mono">{fmt(x.est)} [{fmt(x.low)}, {fmt(x.high)}]</td></tr>)}</tbody></table>
              </div>
              {looRange && <p className="small" style={{ marginTop: 10 }}>Pooled {r.effect} ranges <b>{fmt(looRange.min)}–{fmt(looRange.max)}</b> across omissions — {(looRange.min > meta.refValue) === (looRange.max > meta.refValue) ? 'the direction is robust to any single study' : 'the conclusion is sensitive to individual studies'}.</p>}
            </>
          )}
        </div>
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />PUBLICATION BIAS · EGGER'S TEST</div>
          {!egger ? <p className="empty">Needs ≥3 pooled studies.</p> : (
            <>
              <div className="kv"><span className="k">Intercept</span><span className="val">{fmt(egger.intercept)} (SE {fmt(egger.se)})</span></div>
              <div className="kv"><span className="k">t ({egger.k - 2} df)</span><span className="val">{fmt(egger.t)}</span></div>
              <div className="kv"><span className="k">p-value</span><span className="val"><b style={{ color: egger.p < 0.05 ? 'var(--red)' : 'var(--ink)' }}>{fmt(egger.p, 3)}</b></span></div>
              <div className="divider" />
              <p className="small">{egger.p < 0.05 ? <>Significant intercept → evidence of <b>small-study effects</b>.</> : <>No significant asymmetry.</>} Underpowered with &lt; 10 studies — read with the funnel plot.</p>
            </>
          )}
        </div>
      </div>

      <div className="card lg" style={{ marginTop: 16, borderLeft: `4px solid ${CERT[grade.certainty]}` }}>
        <div className="card-h" style={{ justifyContent: 'space-between' }}>
          <span><span className="sq" style={{ background: CERT[grade.certainty] }} />GRADE · CERTAINTY OF EVIDENCE</span>
          <select className="select" style={{ width: 200 }} value={r.grade?.design ?? 'observational'} onChange={(e) => setGrade({ design: e.target.value })}>
            <option value="observational">Observational studies</option>
            <option value="rct">Randomised trials</option>
          </select>
        </div>
        <div className="flex" style={{ gap: 14, alignItems: 'center', margin: '4px 0 12px' }}>
          <span className="grade-badge" style={{ background: CERT[grade.certainty] }}>⊕ {grade.certainty}</span>
          <span className="small">Outcome: <b>{r.outcomeLabel}</b> · {grade.startLabel}</span>
        </div>
        <div className="tbl-scroll" style={{ border: 'none', boxShadow: 'none' }}>
          <table>
            <thead><tr><th>Domain</th><th>Judgment</th><th>Δ certainty</th></tr></thead>
            <tbody>
              {grade.domains.map((d) => {
                const opts = d.key === 'pubBias' ? ['undetected', 'serious'] : ['not serious', 'serious', 'very serious']
                return (
                  <tr key={d.key}>
                    <td><b>{d.label}</b></td>
                    <td><select className="select" style={{ minWidth: 150 }} value={d.judgment} onChange={(e) => setGrade({ [d.key]: e.target.value })}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select> {d.judgment !== d.auto && <span className="small">(auto: {d.auto})</span>}</td>
                    <td className="mono">{d.drop ? `−${d.drop}` : '0'}</td>
                  </tr>
                )
              })}
              {(r.grade?.design ?? 'observational') !== 'rct' && (
                <tr>
                  <td><b>Large effect (upgrade)</b></td>
                  <td><select className="select" style={{ minWidth: 150 }} value={grade.upgradeLabel} onChange={(e) => setGrade({ largeEffect: e.target.value })}><option value="none">none</option><option value="large">large</option><option value="very large">very large</option></select></td>
                  <td className="mono">{grade.upgrade ? `+${grade.upgrade}` : '0'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10 }}>Summary of findings: {meta.k} studies, {binary ? `${totalEvents} events / ` : ''}{totalN} participants; pooled {r.effect} {fmt(meta.pooledEst)} [{fmt(meta.pooledLow)}, {fmt(meta.pooledHigh)}]; <b style={{ color: CERT[grade.certainty] }}>{grade.certainty}</b> certainty of evidence.</p>
      </div>

      <div className="card lg" style={{ marginTop: 16, borderLeft: '4px solid var(--accent, var(--blue))' }}>
        <div className="card-h" style={{ justifyContent: 'space-between' }}>
          <span><span className="sq" style={{ background: 'var(--accent, var(--blue))' }} />RESULTS PARAGRAPH · AI DRAFT</span>
          {aiOn ? <button className="icon-btn" onClick={() => abortRef.current?.abort()}>Stop</button> : <button className="btn primary sm" onClick={draft}>✦ Draft</button>}
        </div>
        {aiText ? <Markdown text={aiText} /> : <p className="small">Draft a publication-style results paragraph from the pooled estimate, heterogeneity and GRADE.</p>}
      </div>
    </>
  )
}
