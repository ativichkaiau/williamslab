import type { MetaResult } from '../lib/metaAnalysis'
import { fmt } from '../lib/metaAnalysis'
import type { Review } from '../types'

const sans = { fontFamily: 'var(--sans)' } as const
const mono = { fontFamily: 'var(--mono)' } as const
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// ---------------- Forest plot ----------------
export function ForestPlot({ result, index, comparator, measure }: { result: MetaResult; index: string; comparator: string; measure: string }) {
  const { rows, pooledOR, pooledLow, pooledHigh, k } = result
  if (!k) return <p className="empty">No studies with usable 2×2 event data yet — add counts on the Studies page.</p>

  const vals = [...rows.flatMap((r) => [r.low, r.high]), pooledLow, pooledHigh].filter((v) => v > 0 && Number.isFinite(v))
  const dmin = Math.max(0.15, Math.min(...vals) * 0.85)
  const dmax = Math.min(60, Math.max(...vals) * 1.15)
  const lmin = Math.log(Math.min(dmin, 0.85))
  const lmax = Math.log(Math.max(dmax, 1.18))
  const W = 720
  const x0 = 188
  const x1 = 520
  const top = 26
  const rowH = 30
  const H = top + rows.length * rowH + 96
  const X = (or: number) => x0 + ((Math.log(clamp(or, Math.exp(lmin), Math.exp(lmax))) - lmin) / (lmax - lmin)) * (x1 - x0)
  const ticks = [0.25, 0.5, 1, 2, 4, 8, 16].filter((t) => t >= dmin * 0.7 && t <= dmax * 1.3)
  const axisY = top + rows.length * rowH + 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={sans}>
      {/* header */}
      <text x={8} y={16} fontSize="10.5" fontWeight={700} fill="var(--muted)" style={mono}>STUDY</text>
      <text x={x1 + 8} y={16} fontSize="10.5" fontWeight={700} fill="var(--muted)" style={mono}>{measure} [95% CI]</text>
      <text x={W - 6} y={16} fontSize="10.5" fontWeight={700} fill="var(--muted)" textAnchor="end" style={mono}>WT%</text>
      {/* reference line at 1 */}
      <line x1={X(1)} y1={top} x2={X(1)} y2={axisY} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
      {/* rows */}
      {rows.map((r, i) => {
        const y = top + i * rowH + rowH / 2
        const side = clamp(4 + Math.sqrt(r.weight) * 2.2, 5, 17)
        return (
          <g key={r.id}>
            <text x={8} y={y + 4} fontSize="12" fill="var(--ink)" style={sans}>{r.label}</text>
            <line x1={X(r.low)} y1={y} x2={X(r.high)} y2={y} stroke="var(--blue)" strokeWidth={1.6} />
            <line x1={X(r.low)} y1={y - 4} x2={X(r.low)} y2={y + 4} stroke="var(--blue)" strokeWidth={1.6} />
            <line x1={X(r.high)} y1={y - 4} x2={X(r.high)} y2={y + 4} stroke="var(--blue)" strokeWidth={1.6} />
            <rect x={X(r.or) - side / 2} y={y - side / 2} width={side} height={side} fill="var(--navy)" />
            <text x={x1 + 8} y={y + 4} fontSize="11" fill="var(--ink-2)" style={mono}>{fmt(r.or)} [{fmt(r.low)}, {fmt(r.high)}]</text>
            <text x={W - 6} y={y + 4} fontSize="10.5" fill="var(--muted)" textAnchor="end" style={mono}>{fmt(r.weight, 1)}</text>
          </g>
        )
      })}
      {/* pooled diamond */}
      {(() => {
        const y = axisY - 2
        const d = `${X(pooledLow)},${y} ${X(pooledOR)},${y - 8} ${X(pooledHigh)},${y} ${X(pooledOR)},${y + 8}`
        return (
          <g>
            <polygon points={d} fill="var(--red)" stroke="var(--red)" />
            <text x={8} y={y + 4} fontSize="12" fontWeight={800} fill="var(--red)" style={sans}>Pooled ({result.model})</text>
            <text x={x1 + 8} y={y + 4} fontSize="11" fontWeight={800} fill="var(--red)" style={mono}>{fmt(pooledOR)} [{fmt(pooledLow)}, {fmt(pooledHigh)}]</text>
          </g>
        )
      })()}
      {/* axis */}
      <line x1={x0} y1={axisY + 12} x2={x1} y2={axisY + 12} stroke="var(--line)" strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} y1={axisY + 12} x2={X(t)} y2={axisY + 17} stroke="var(--muted)" strokeWidth={1} />
          <text x={X(t)} y={axisY + 30} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>{t}</text>
        </g>
      ))}
      <text x={X(1) - 6} y={axisY + 46} textAnchor="end" fontSize="9.5" fill="var(--muted)" style={sans}>← favours {comparator}</text>
      <text x={X(1) + 6} y={axisY + 46} fontSize="9.5" fill="var(--muted)" style={sans}>favours {index} →</text>
    </svg>
  )
}

// ---------------- Funnel plot ----------------
export function FunnelPlot({ result }: { result: MetaResult }) {
  const { rows, pooledOR, k } = result
  if (k < 3) return <p className="empty">Funnel plot needs ≥3 studies.</p>
  const pooledLog = Math.log(pooledOR)
  const ses = rows.map((r) => r.se)
  const maxSE = Math.max(...ses) * 1.15
  const spread = Math.max(...rows.map((r) => Math.abs(r.logor - pooledLog)), 1.96 * maxSE)
  const W = 460
  const Hh = 300
  const x0 = 46
  const x1 = W - 20
  const y0 = 30
  const y1 = Hh - 40
  const X = (log: number) => (x0 + x1) / 2 + (log - pooledLog) / (spread * 1.1) * ((x1 - x0) / 2)
  const Y = (se: number) => y0 + (se / maxSE) * (y1 - y0) // small SE at top
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={sans}>
      {/* pseudo 95% CI funnel */}
      <polygon points={`${X(pooledLog)},${Y(0)} ${X(pooledLog - 1.96 * maxSE)},${Y(maxSE)} ${X(pooledLog + 1.96 * maxSE)},${Y(maxSE)}`} fill="var(--card-2)" stroke="var(--line)" strokeWidth={1} />
      <line x1={X(pooledLog)} y1={y0} x2={X(pooledLog)} y2={y1} stroke="var(--red)" strokeWidth={1.4} strokeDasharray="4 4" />
      {rows.map((r) => (
        <circle key={r.id} cx={X(r.logor)} cy={Y(r.se)} r={5} fill="var(--navy)" stroke="#fff" strokeWidth={1.4} />
      ))}
      {/* axes */}
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="var(--line)" strokeWidth={1.5} />
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="var(--line)" strokeWidth={1.5} />
      <text x={(x0 + x1) / 2} y={Hh - 8} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>log odds ratio</text>
      <text x={12} y={(y0 + y1) / 2} fontSize="9.5" fill="var(--muted)" style={mono} transform={`rotate(-90 12 ${(y0 + y1) / 2})`}>standard error</text>
    </svg>
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
  const mainX = 40
  const mainW = 300
  const sideX = 400
  const sideW = 300
  return (
    <svg viewBox="0 0 720 560" width="100%" style={sans}>
      <defs>
        <marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="var(--muted)" /></marker>
      </defs>
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
