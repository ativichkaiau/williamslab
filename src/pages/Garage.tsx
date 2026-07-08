import { Link } from 'react-router-dom'
import { useRef } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, StatCard, SevDot } from '../components/ui'
import { INSTABILITY_LABEL } from '../lib/palette'
import { STAGES } from '../types'

function rel(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

const KIND_COLOR: Record<string, string> = {
  study: '#6366f1', studies: '#6366f1', literature: '#f59e0b', graph: '#4f46e5',
  hypothesis: '#7c3aed', assay: '#12b981', stage: '#0d9488', instability: '#e2001a',
}

export default function Garage() {
  const { state, instabilities, stability, reset, setStage, exportActive, importProject } = useStore()
  const open = instabilities.filter((i) => i.status === 'open')
  const highs = open.filter((i) => i.severity === 'high')
  const fileRef = useRef<HTMLInputElement>(null)
  // Date.now is fine at render time in the browser
  const now = Date.now()

  const stage = state.project.stage ?? 'Protocol'
  const stageIdx = Math.max(0, STAGES.indexOf(stage as (typeof STAGES)[number]))

  // % complete derived from real project signals, not a hardcoded number
  const rv = state.review
  const incl = rv.studies.filter((s) => s.include)
  const signals: { label: string; done: boolean }[] = [
    { label: 'Central hypothesis defined', done: state.project.centralHypothesis.trim().length > 20 },
    { label: 'Hypotheses on the graph', done: state.hypotheses.length > 0 },
    { label: 'Review question & PICO', done: !!rv.question && !!rv.pico.i && !!rv.pico.o },
    { label: 'Search strategy recorded', done: rv.searches.length > 0 },
    { label: 'Studies extracted', done: rv.studies.length > 0 },
    { label: 'Pooled estimate possible (≥2 studies)', done: incl.length >= 2 },
    { label: 'Assays planned', done: state.assays.length > 0 },
    { label: 'Risk-of-bias / GRADE assessed', done: !!rv.grade || rv.studies.some((s) => s.rob && Object.keys(s.rob).length > 0) },
    { label: 'No open high-severity flags', done: highs.length === 0 },
  ]
  const doneN = signals.filter((s) => s.done).length
  const progress = Math.round((doneN / signals.length) * 100)

  function doExport() {
    const blob = new Blob([exportActive()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.project.code.toLowerCase()}.williamslab.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((t) => {
      if (!importProject(t)) alert('Could not import — the file is not a valid WilliamsLab project export.')
    })
    e.target.value = ''
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>PROJECT OVERVIEW</Kicker>
        <h1>{state.project.name}</h1>
        <p>{state.project.domain} · {state.project.code}</p>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard value={`${Math.round(stability * 100)}%`} label="Project rigor" sub={`${open.length} open flags`} tone="#1746d1" />
        <StatCard value={state.hypotheses.length} label="Hypotheses" sub="on the graph" tone="#7c3aed" />
        <StatCard value={state.assays.length} label="Assays planned" sub={`${state.assays.filter((a) => a.status === 'running' || a.status === 'piloting').length} in progress`} tone="#12b981" />
        <StatCard value={state.nodes.length} label="Graph nodes" sub={`${state.edges.length} edges`} tone="#f59e0b" />
      </div>

      <div className="card lg" style={{ marginBottom: 16, borderLeft: '4px solid #0d9488', background: 'linear-gradient(180deg, color-mix(in srgb,#0d9488 7%, var(--card)), var(--card))' }}>
        <div className="card-h"><span className="sq" style={{ background: '#0d9488' }} />SYSTEMATIC REVIEW &amp; META-ANALYSIS</div>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{state.review.title}</p>
        <p className="small" style={{ marginBottom: 12 }}>{state.review.question}</p>
        <div className="wrap-gap">
          <Link className="btn primary sm" to="/protocol">Protocol</Link>
          <Link className="btn ghost sm" to="/prisma">PRISMA flow</Link>
          <Link className="btn ghost sm" to="/studies">Studies ({incl.length})</Link>
          <Link className="btn ghost sm" to="/meta">Meta-analysis</Link>
        </div>
      </div>

      <div className="grid g2">
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />CENTRAL HYPOTHESIS</div>
          <p className="hyp-quote">{state.project.centralHypothesis}</p>
          <div className="divider" />
          <div className="wrap-gap">
            <Link className="btn primary sm" to="/pit-wall">Open the Dashboard →</Link>
            <Link className="btn ghost sm" to="/mechanism">Mechanism Map</Link>
            <Link className="btn ghost sm" to="/graph">Knowledge Graph</Link>
          </div>
        </div>

        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--red)' }} />TOP INSTABILITIES</div>
          {highs.length === 0 && <p className="empty">No high-severity flags — no critical issues.</p>}
          {highs.slice(0, 5).map((i) => (
            <div className="list-item" key={i.id}>
              <SevDot severity={i.severity} label="" />
              <div>
                <b>{INSTABILITY_LABEL[i.type]}</b>
                <div className="small">{i.signal}</div>
              </div>
            </div>
          ))}
          <div className="divider" />
          <Link className="btn ghost sm" to="/suspension">Go to Rigor Monitor →</Link>
        </div>
      </div>

      <div className="card lg" style={{ marginTop: 16 }}>
        <div className="card-h">
          <span className="sq" style={{ background: 'var(--yellow)' }} />PROJECT STAGE
          <span className="pill" style={{ marginLeft: 'auto', borderColor: 'var(--blue)', color: 'var(--blue)' }}>{progress}% complete</span>
        </div>
        <div className="stage-track" title={`${doneN} of ${signals.length} milestones met`}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="wrap-gap" style={{ marginTop: 12 }}>
          {STAGES.map((s, idx) => {
            const state_ = idx < stageIdx ? 'past' : idx === stageIdx ? 'now' : 'future'
            return (
              <button
                key={s}
                className={`stage-pill ${state_}`}
                onClick={() => setStage(s)}
                title={idx === stageIdx ? 'Current stage' : `Set stage to ${s}`}
              >
                {String(idx + 1).padStart(2, '0')} {s}
              </button>
            )
          })}
        </div>
        <p className="small" style={{ marginTop: 12 }}>
          Currently at the <b>{stage}</b> stage. The bar reflects <b>{doneN}/{signals.length}</b> real milestones —
          click any step to update where the project stands.
        </p>
        <div className="divider" />
        <div className="grid g2" style={{ gap: 8 }}>
          {signals.map((s) => (
            <div key={s.label} className="sig-row">
              <span className={`sig-dot ${s.done ? 'on' : ''}`}>{s.done ? '✓' : ''}</span>
              <span style={{ color: s.done ? 'var(--ink)' : 'var(--muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card lg" style={{ marginTop: 16 }}>
        <div className="card-h"><span className="sq" style={{ background: '#6366f1' }} />RECENT ACTIVITY</div>
        {state.activity.length === 0 && <p className="empty">No activity yet — add a study, hypothesis, or assay and it will show up here.</p>}
        {state.activity.slice(0, 12).map((a) => (
          <div className="act-row" key={a.id}>
            <span className="act-dot" style={{ background: KIND_COLOR[a.kind] ?? 'var(--muted)' }} />
            <span className="act-kind" style={{ color: KIND_COLOR[a.kind] ?? 'var(--muted)' }}>{a.kind}</span>
            <span className="act-text">{a.text}</span>
            <span className="act-time">{rel(a.ts, now)}</span>
          </div>
        ))}
      </div>

      <div className="flex" style={{ marginTop: 18, justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="wrap-gap">
          <button className="btn ghost sm" onClick={doExport}>⤓ Export project (JSON)</button>
          <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>⤒ Import project</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportFile} />
        </div>
        <button className="icon-btn danger" onClick={() => { if (confirm('Reset all edits back to the seed Brugada project?')) reset() }}>Reset to seed data</button>
      </div>
    </>
  )
}
