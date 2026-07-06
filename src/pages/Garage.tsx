import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Kicker, Rule, StatCard, SevDot } from '../components/ui'
import { INSTABILITY_LABEL } from '../lib/palette'

export default function Garage() {
  const { state, instabilities, stability, reset } = useStore()
  const open = instabilities.filter((i) => i.status === 'open')
  const highs = open.filter((i) => i.severity === 'high')

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>PROJECT OVERVIEW</Kicker>
        <h1>{state.project.name}</h1>
        <p>{state.project.domain} · {state.project.code}</p>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard value={`${Math.round(stability * 100)}%`} label="Project rigor" sub={`${open.length} open flags`} />
        <StatCard value={state.hypotheses.length} label="Hypotheses" sub="on the graph" />
        <StatCard value={state.assays.length} label="Assays planned" sub={`${state.assays.filter((a) => a.status === 'running' || a.status === 'piloting').length} in progress`} />
        <StatCard value={state.nodes.length} label="Graph nodes" sub={`${state.edges.length} edges`} />
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
        <div className="card-h"><span className="sq" style={{ background: 'var(--yellow)' }} />PROJECT STAGE</div>
        <div className="wrap-gap">
          {['Idea', 'Concept', 'Lit review', 'Hypothesis', 'Protocol', 'Ethics', 'Data', 'Analysis', 'Abstract', 'Submit', 'Pitch'].map((s, idx) => (
            <span key={s} className="pill" style={idx <= 4 ? { borderColor: 'var(--blue)', color: 'var(--blue)' } : undefined}>
              {String(idx + 1).padStart(2, '0')} {s}
            </span>
          ))}
        </div>
        <p className="small" style={{ marginTop: 12 }}>Currently at the <b>Protocol</b> stage — assays are being planned and the rigor monitor is flagging design issues to fix before data collection.</p>
      </div>

      <div className="flex" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
        <button className="icon-btn danger" onClick={() => { if (confirm('Reset all edits back to the seed Brugada project?')) reset() }}>Reset to seed data</button>
      </div>
    </>
  )
}
