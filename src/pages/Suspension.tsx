import { useStore } from '../lib/store'
import { Kicker, Rule, SevDot } from '../components/ui'
import { INSTABILITY_LABEL, SEVERITY_COLOR } from '../lib/palette'
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

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>RESEARCH ACTIVE SUSPENSION · SENSOR ARRAY</Kicker>
        <h1>Active Suspension</h1>
        <p>Nine sensors watch the research chassis. Each open flag drags stability down; apply the repair — or clear one live below — and the chassis re-plants.</p>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="stat">
          <b style={{ color: gaugeCol }}>{Math.round(stability * 100)}%</b>
          <span>Chassis stability</span>
          <div className="sub">{open} open · {instabilities.length - open} handled</div>
        </div>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />LIVE REPAIRS · STATISTICAL STRATEGY</div>
          <label className="flex" style={{ cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={state.project.preRegistered} onChange={(e) => setPreRegistered(e.target.checked)} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Pre-register the analysis plan</span>
          </label>
          <div className="kv" style={{ alignItems: 'center' }}>
            <span className="k">Primary EP</span>
            <input
              className="pill"
              style={{ fontFamily: 'var(--sans)', minWidth: 260, flex: 1 }}
              placeholder="e.g. SCN5A-promoter methylation index (pyroseq)"
              value={state.project.primaryEndpoint ?? ''}
              onChange={(e) => setPrimaryEndpoint(e.target.value || undefined)}
            />
          </div>
          <p className="small" style={{ marginTop: 8 }}>Set both and the <b>statistical-ambiguity</b> flag clears itself — the sensor is reading real project state.</p>
        </div>
      </div>

      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Target</th>
              <th>Warning sign</th>
              <th>Repair</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => (
              <tr key={i.id} style={i.status !== 'open' ? { opacity: 0.5 } : undefined}>
                <td style={{ whiteSpace: 'nowrap' }}><SevDot severity={i.severity} label={INSTABILITY_LABEL[i.type]} /></td>
                <td className="mono small">{i.targetLabel ?? i.target}</td>
                <td className="muted">{i.signal}</td>
                <td className="muted">{i.repair}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {i.status === 'open' && (
                      <>
                        <button className="btn ghost sm" onClick={() => setInstabilityStatus(i.id, 'acknowledged')}>Ack</button>
                        <button className="btn primary sm" onClick={() => setInstabilityStatus(i.id, 'resolved')}>Resolve</button>
                      </>
                    )}
                    {i.status !== 'open' && (
                      <>
                        <span className="badge b-done">{i.status}</span>
                        <button className="btn ghost sm" onClick={() => setInstabilityStatus(i.id, 'open')}>Reopen</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
