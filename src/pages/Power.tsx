import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, AssayBadge } from '../components/ui'
import { Field } from '../components/Modal'
import { twoSampleTPower, requiredNPerGroup, assayPowerReport, fmtAlpha } from '../lib/power'

function powerColor(p: number) {
  if (p >= 0.8) return 'var(--green)'
  if (p >= 0.5) return 'var(--amber)'
  return 'var(--red)'
}

export default function Power() {
  const { state } = useStore()
  const [d, setD] = useState(0.8)
  const [baseAlpha, setBaseAlpha] = useState(0.05)
  const [target, setTarget] = useState(0.8)
  const [nPerGroup, setN] = useState(12)
  const [genomeWide, setGW] = useState(false)
  const [tests, setTests] = useState(100000)

  const alpha = genomeWide ? baseAlpha / tests : baseAlpha
  const power = twoSampleTPower({ nPerGroup, d, alpha })
  const reqN = requiredNPerGroup({ d, alpha, power: target })

  // power-vs-n curve
  const curve = useMemo(() => {
    const maxN = Math.max(40, Math.ceil(reqN * 1.3))
    const pts: { n: number; p: number }[] = []
    for (let n = 2; n <= maxN; n += Math.max(1, Math.round(maxN / 60))) {
      pts.push({ n, p: twoSampleTPower({ nPerGroup: n, d, alpha }) })
    }
    return { pts, maxN }
  }, [d, alpha, reqN])

  const W = 460
  const H = 190
  const px = (n: number) => 34 + (n / curve.maxN) * (W - 46)
  const py = (p: number) => H - 24 - p * (H - 40)
  const path = curve.pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${px(pt.n).toFixed(1)},${py(pt.p).toFixed(1)}`).join(' ')

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>DOWNFORCE · STATISTICAL POWER</Kicker>
        <h1>Power &amp; sample size</h1>
        <p>Two-sample comparison (patient vs control) on a continuous readout, normal approximation to the t-test. Genome-wide assays pay a multiple-testing tax on α — the same math the underpowered sensor now uses.</p>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />CALCULATOR</div>
          <div className="form-row">
            <Field label="Effect size (Cohen's d)"><input className="input" type="number" step="0.1" min="0.1" value={d} onChange={(e) => setD(Math.max(0.1, +e.target.value))} /></Field>
            <Field label="n per group"><input className="input" type="number" min="2" value={nPerGroup} onChange={(e) => setN(Math.max(2, Math.round(+e.target.value)))} /></Field>
          </div>
          <div className="form-row">
            <Field label="Base α"><input className="input" type="number" step="0.01" min="0.0001" value={baseAlpha} onChange={(e) => setBaseAlpha(+e.target.value)} /></Field>
            <Field label="Target power"><input className="input" type="number" step="0.05" min="0.5" max="0.99" value={target} onChange={(e) => setTarget(+e.target.value)} /></Field>
          </div>
          <label className={`check${genomeWide ? ' on' : ''}`} style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={genomeWide} onChange={(e) => setGW(e.target.checked)} /> Genome-wide (correct α for multiple testing)
          </label>
          {genomeWide && (
            <Field label="Simultaneous tests" hint={`per-test α = ${fmtAlpha(alpha)}`}>
              <input className="input" type="number" min="1" value={tests} onChange={(e) => setTests(Math.max(1, Math.round(+e.target.value)))} />
            </Field>
          )}
          <div className="divider" />
          <div className="grid g2">
            <div className="stat"><b style={{ color: powerColor(power) }}>{Math.round(power * 100)}%</b><span>Power at n={nPerGroup}/group</span></div>
            <div className="stat"><b>{Number.isFinite(reqN) ? reqN : '∞'}</b><span>n/group for {Math.round(target * 100)}% power</span><div className="sub">{Number.isFinite(reqN) ? reqN * 2 : '∞'} total</div></div>
          </div>
        </div>

        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />POWER vs SAMPLE SIZE</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
            {/* gridlines */}
            {[0, 0.25, 0.5, 0.8, 1].map((g) => (
              <g key={g}>
                <line x1={34} y1={py(g)} x2={W - 12} y2={py(g)} stroke="var(--line)" strokeWidth={1} strokeDasharray={g === 0.8 ? '4 4' : undefined} />
                <text x={26} y={py(g) + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--mono)">{g}</text>
              </g>
            ))}
            {/* target power marker */}
            <text x={W - 14} y={py(0.8) - 4} textAnchor="end" fontSize="8.5" fill="var(--amber)" fontFamily="var(--mono)">0.8 target</text>
            {/* curve */}
            <path d={path} fill="none" stroke="var(--blue)" strokeWidth={2.4} />
            {/* current n marker */}
            {nPerGroup <= curve.maxN && <circle cx={px(nPerGroup)} cy={py(power)} r={4.5} fill={powerColor(power)} stroke="#fff" strokeWidth={1.5} />}
            <text x={(W) / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="var(--mono)">n per group →</text>
          </svg>
          <p className="small" style={{ marginTop: 8 }}>d={d}, α={fmtAlpha(alpha)}{genomeWide ? ` (${tests.toLocaleString()} tests)` : ''}. The dot is your current design.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-scroll" style={{ border: 'none', boxShadow: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Assay</th>
                <th>n total → /group</th>
                <th>d</th>
                <th>per-test α</th>
                <th>Power</th>
                <th>Need /group</th>
                <th>Status</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {state.assays.map((a) => {
                const rep = assayPowerReport(a)
                if (!rep) return (
                  <tr key={a.id}><td><b>{a.method}</b></td><td colSpan={7} className="muted">no sample size set</td></tr>
                )
                return (
                  <tr key={a.id}>
                    <td><b>{a.method}</b>{a.genomeWide && <div className="small">genome-wide · ~{rep.tests.toLocaleString()} tests</div>}</td>
                    <td className="mono">{a.sampleN} → {rep.nPerGroup}</td>
                    <td className="mono">{rep.d}</td>
                    <td className="mono">{fmtAlpha(rep.alpha)}</td>
                    <td>
                      <div className="flex" style={{ gap: 8 }}>
                        <span className="bar" style={{ width: 70, height: 8, borderRadius: 4, background: 'var(--card-2)', border: '1px solid var(--line)', overflow: 'hidden', display: 'inline-block' }}>
                          <i style={{ display: 'block', height: '100%', width: `${Math.round(rep.power * 100)}%`, background: powerColor(rep.power) }} />
                        </span>
                        <span className="mono" style={{ color: powerColor(rep.power), fontWeight: 700 }}>{Math.round(rep.power * 100)}%</span>
                      </div>
                    </td>
                    <td className="mono">{rep.requiredNPerGroup}</td>
                    <td><AssayBadge status={a.status} /></td>
                    <td style={{ color: rep.adequate ? 'var(--good-ink)' : 'var(--bad-ink)', fontWeight: 700, fontSize: 12 }}>{rep.adequate ? 'powered' : 'underpowered'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10 }}>Defaults: targeted assays assume d=1.0, genome-wide d=0.8 with ~100,000 tests unless the assay sets its own. Set a per-assay expected effect in the Assays editor to refine.</p>
    </>
  )
}
