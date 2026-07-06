import type { MetaResult } from '../lib/metaAnalysis'
import { fmt } from '../lib/metaAnalysis'
import type { Review, Study, RobLevel } from '../types'

const sans = { fontFamily: 'var(--sans)' } as const
const mono = { fontFamily: 'var(--mono)' } as const
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const ROB_COLOR: Record<RobLevel, string> = { low: '#12b981', some: '#f59e0b', high: '#e2001a' }

function niceTicks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo || 1
  const step0 = span / n
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const norm = step0 / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const start = Math.ceil(lo / step) * step
  const out: number[] = []
  for (let v = start; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6))
  return out
}

// ---------------- Forest plot (log or linear scale) ----------------
export function ForestPlot({ result, index, measure }: { result: MetaResult; index: string; comparator?: string; measure: string }) {
  const { rows, pooledEst, pooledLow, pooledHigh, k, scale, refValue } = result
  if (!k) return <p className="empty">No studies with usable data for this measure yet — add data on the Studies page.</p>
  const isLog = scale === 'log'
  const tx = (v: number) => (isLog ? Math.log(Math.max(v, 1e-6)) : v)
  const vals = [...rows.flatMap((r) => [r.low, r.high]), pooledLow, pooledHigh, refValue].filter((v) => Number.isFinite(v))
  let lo = Math.min(...vals.map(tx))
  let hi = Math.max(...vals.map(tx))
  const pad = (hi - lo) * 0.08 || 0.3
  lo -= pad
  hi += pad
  const W = 720, x0 = 190, x1 = 520, top = 26, rowH = 30
  const H = top + rows.length * rowH + 96
  const X = (v: number) => x0 + ((clamp(tx(v), lo, hi) - lo) / (hi - lo)) * (x1 - x0)
  const ticks = isLog
    ? [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32].filter((t) => tx(t) >= lo && tx(t) <= hi)
    : niceTicks(lo, hi, 6)
  const axisY = top + rows.length * rowH + 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={sans}>
      <text x={8} y={16} fontSize="10.5" fontWeight={700} fill="var(--muted)" style={mono}>STUDY</text>
      <text x={x1 + 8} y={16} fontSize="10.5" fontWeight={700} fill="var(--muted)" style={mono}>{measure} [95% CI]</text>
      <text x={W - 6} y={16} fontSize="10.5" fontWeight={700} fill="var(--muted)" textAnchor="end" style={mono}>WT%</text>
      <line x1={X(refValue)} y1={top} x2={X(refValue)} y2={axisY} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
      {rows.map((r, i) => {
        const y = top + i * rowH + rowH / 2
        const side = clamp(4 + Math.sqrt(r.weight) * 2.2, 5, 17)
        return (
          <g key={r.id}>
            <text x={8} y={y + 4} fontSize="12" fill="var(--ink)" style={sans}>{r.label}</text>
            <line x1={X(r.low)} y1={y} x2={X(r.high)} y2={y} stroke="var(--blue)" strokeWidth={1.6} />
            <line x1={X(r.low)} y1={y - 4} x2={X(r.low)} y2={y + 4} stroke="var(--blue)" strokeWidth={1.6} />
            <line x1={X(r.high)} y1={y - 4} x2={X(r.high)} y2={y + 4} stroke="var(--blue)" strokeWidth={1.6} />
            <rect x={X(r.est) - side / 2} y={y - side / 2} width={side} height={side} fill="var(--navy)" />
            <text x={x1 + 8} y={y + 4} fontSize="11" fill="var(--ink-2)" style={mono}>{fmt(r.est)} [{fmt(r.low)}, {fmt(r.high)}]</text>
            <text x={W - 6} y={y + 4} fontSize="10.5" fill="var(--muted)" textAnchor="end" style={mono}>{fmt(r.weight, 1)}</text>
          </g>
        )
      })}
      {(() => {
        const y = axisY - 2
        return (
          <g>
            <polygon points={`${X(pooledLow)},${y} ${X(pooledEst)},${y - 8} ${X(pooledHigh)},${y} ${X(pooledEst)},${y + 8}`} fill="var(--red)" stroke="var(--red)" />
            <text x={8} y={y + 4} fontSize="12" fontWeight={800} fill="var(--red)" style={sans}>Pooled ({result.model})</text>
            <text x={x1 + 8} y={y + 4} fontSize="11" fontWeight={800} fill="var(--red)" style={mono}>{fmt(pooledEst)} [{fmt(pooledLow)}, {fmt(pooledHigh)}]</text>
          </g>
        )
      })()}
      <line x1={x0} y1={axisY + 12} x2={x1} y2={axisY + 12} stroke="var(--line)" strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} y1={axisY + 12} x2={X(t)} y2={axisY + 17} stroke="var(--muted)" strokeWidth={1} />
          <text x={X(t)} y={axisY + 30} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>{t}</text>
        </g>
      ))}
      <text x={X(refValue) - 6} y={axisY + 46} textAnchor="end" fontSize="9.5" fill="var(--muted)" style={sans}>← lower in {index}</text>
      <text x={X(refValue) + 6} y={axisY + 46} fontSize="9.5" fill="var(--muted)" style={sans}>higher in {index} →</text>
    </svg>
  )
}

// ---------------- Funnel plot ----------------
export function FunnelPlot({ result }: { result: MetaResult }) {
  const { rows, pooledPool, k } = result
  if (k < 3) return <p className="empty">Funnel plot needs ≥3 studies.</p>
  const ses = rows.map((r) => r.se)
  const maxSE = Math.max(...ses) * 1.15
  const spread = Math.max(...rows.map((r) => Math.abs(r.pool - pooledPool)), 1.96 * maxSE)
  const W = 460, Hh = 300, x0 = 46, x1 = W - 20, y0 = 30, y1 = Hh - 40
  const X = (v: number) => (x0 + x1) / 2 + ((v - pooledPool) / (spread * 1.1)) * ((x1 - x0) / 2)
  const Y = (se: number) => y0 + (se / maxSE) * (y1 - y0)
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={sans}>
      <polygon points={`${X(pooledPool)},${Y(0)} ${X(pooledPool - 1.96 * maxSE)},${Y(maxSE)} ${X(pooledPool + 1.96 * maxSE)},${Y(maxSE)}`} fill="var(--card-2)" stroke="var(--line)" strokeWidth={1} />
      <line x1={X(pooledPool)} y1={y0} x2={X(pooledPool)} y2={y1} stroke="var(--red)" strokeWidth={1.4} strokeDasharray="4 4" />
      {rows.map((r) => <circle key={r.id} cx={X(r.pool)} cy={Y(r.se)} r={5} fill="var(--navy)" stroke="#fff" strokeWidth={1.4} />)}
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="var(--line)" strokeWidth={1.5} />
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="var(--line)" strokeWidth={1.5} />
      <text x={(x0 + x1) / 2} y={Hh - 8} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>effect ({result.scale === 'log' ? 'log' : 'linear'} scale)</text>
      <text x={12} y={(y0 + y1) / 2} fontSize="9.5" fill="var(--muted)" style={mono} transform={`rotate(-90 12 ${(y0 + y1) / 2})`}>standard error</text>
    </svg>
  )
}

// ---------------- Risk-of-bias summary (traffic light + bar) ----------------
export function RobPlot({ studies, domains }: { studies: Study[]; domains: string[] }) {
  const incl = studies.filter((s) => s.include)
  const overall = (s: Study): RobLevel => {
    const vals = domains.map((d) => s.rob?.[d])
    return vals.includes('high') ? 'high' : vals.includes('some') ? 'some' : 'low'
  }
  const cols = [...domains, 'Overall']
  const dot = (lvl: RobLevel | undefined) => (
    <span style={{ display: 'inline-block', width: 15, height: 15, borderRadius: '50%', background: ROB_COLOR[lvl ?? 'some'], boxShadow: 'inset 0 -2px 3px rgba(0,0,0,.18)' }} />
  )
  const levels: RobLevel[] = ['low', 'some', 'high']
  const barFor = (col: string) => {
    const vals = incl.map((s) => (col === 'Overall' ? overall(s) : s.rob?.[col] ?? 'some'))
    const n = vals.length || 1
    return levels.map((l) => ({ l, pct: (vals.filter((v) => v === l).length / n) * 100 }))
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }} className="rob-figure">
      <div style={{ overflowX: 'auto' }}>
        <div className="small mono" style={{ marginBottom: 8, color: 'var(--muted)' }}>TRAFFIC-LIGHT</div>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, color: 'var(--muted)' }}>Study</th>
              {cols.map((c) => <th key={c} style={{ padding: '4px 6px', fontSize: 10, color: 'var(--muted)', writingMode: c.length > 6 ? 'vertical-rl' : undefined, transform: c.length > 6 ? 'rotate(180deg)' : undefined }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {incl.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>{s.author} {s.year}</td>
                {domains.map((d) => <td key={d} style={{ textAlign: 'center', padding: '3px 6px' }}>{dot(s.rob?.[d])}</td>)}
                <td style={{ textAlign: 'center', padding: '3px 6px' }}>{dot(overall(s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="small mono" style={{ marginBottom: 8, color: 'var(--muted)' }}>ACROSS STUDIES</div>
        {cols.map((c) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <span style={{ width: 96, fontSize: 12, fontWeight: 600, flex: 'none' }}>{c}</span>
            <span style={{ flex: 1, display: 'flex', height: 15, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--line)' }}>
              {barFor(c).map((b) => <span key={b.l} style={{ width: `${b.pct}%`, background: ROB_COLOR[b.l] }} />)}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {levels.map((l) => <span key={l} className="small" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{dot(l)} {l}</span>)}
        </div>
      </div>
    </div>
  )
}

// ---------------- PRISMA 2020 flow ----------------
export function PrismaFlow({ prisma }: { prisma: Review['prisma'] }) {
  const p = prisma
  const box = (x: number, y: number, w: number, h: number, lines: string[], accent?: boolean) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={accent ? 'var(--good)' : 'var(--card)'} stroke={accent ? 'var(--green)' : 'var(--line)'} strokeWidth={accent ? 1.8 : 1.3} />
      {lines.map((l, i) => (
        <text key={i} x={x + 12} y={y + 20 + i * 15} fontSize={i === 0 ? '11.5' : '10.5'} fontWeight={i === 0 ? 700 : 400} fill={i === 0 ? 'var(--ink)' : 'var(--ink-2)'} style={i === 0 ? sans : mono}>{l}</text>
      ))}
    </g>
  )
  const arrow = (x1: number, y1: number, x2: number, y2: number) => <path d={`M${x1},${y1} L${x2},${y2}`} fill="none" stroke="var(--muted)" strokeWidth={1.6} markerEnd="url(#pa)" />
  const mainX = 40, mainW = 300, sideX = 400, sideW = 300
  return (
    <svg viewBox="0 0 720 560" width="100%" style={sans}>
      <defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="var(--muted)" /></marker></defs>
      {box(mainX, 20, mainW, 66, ['Records identified', `Databases (n = ${p.dbRecords})`, `Other sources (n = ${p.otherRecords})`])}
      {arrow(mainX + mainW / 2, 86, mainX + mainW / 2, 118)}
      {box(mainX, 118, mainW, 50, ['Records screened', `(n = ${p.screened})`])}
      {box(sideX, 24, sideW, 50, ['Duplicates removed', `(n = ${p.duplicates})`])}
      {arrow(mainX + mainW, 132, sideX, 132)}
      {box(sideX, 118, sideW, 50, ['Records excluded', `(n = ${p.excludedScreen})`])}
      {arrow(mainX + mainW / 2, 168, mainX + mainW / 2, 200)}
      {box(mainX, 200, mainW, 50, ['Reports assessed for eligibility', `(n = ${p.fullText})`])}
      {arrow(mainX + mainW, 225, sideX, 225)}
      {box(sideX, 200, sideW, 40 + p.fullTextExcluded.length * 15, ['Reports excluded:', ...p.fullTextExcluded.map((e) => `${e.reason} (n = ${e.n})`)])}
      {arrow(mainX + mainW / 2, 250, mainX + mainW / 2, 300)}
      {box(mainX, 300, mainW, 50, ['Studies included in synthesis', `(n = ${p.included})`], true)}
    </svg>
  )
}
