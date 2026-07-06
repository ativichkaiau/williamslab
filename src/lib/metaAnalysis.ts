import type { Study } from '../types'

// ============================================================
// Meta-analysis of a binary outcome (odds ratio).
// Inverse-variance pooling, fixed-effect and DerSimonian–Laird
// random-effects, with Cochran's Q, I² and τ². Continuity
// correction (0.5) applied when a 2×2 cell is zero.
// ============================================================

export interface MetaRow {
  id: string
  label: string
  or: number
  low: number
  high: number
  logor: number
  se: number
  weight: number // % of the pooled estimate
  expEvents: number
  expTotal: number
  ctrlEvents: number
  ctrlTotal: number
}

export interface MetaResult {
  rows: MetaRow[]
  k: number
  pooledOR: number
  pooledLow: number
  pooledHigh: number
  Q: number
  df: number
  I2: number
  tau2: number
  model: 'random' | 'fixed'
  pValue: number // heterogeneity p (Q vs chi-square, approx)
}

function cells(s: Study) {
  let a = s.expEvents ?? 0
  let b = (s.expTotal ?? 0) - a
  let c = s.ctrlEvents ?? 0
  let d = (s.ctrlTotal ?? 0) - c
  if (a === 0 || b === 0 || c === 0 || d === 0) {
    a += 0.5
    b += 0.5
    c += 0.5
    d += 0.5
  }
  const logor = Math.log((a * d) / (b * c))
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
  return { logor, se }
}

export function usable(s: Study): boolean {
  return s.include && !!s.expTotal && !!s.ctrlTotal && s.expEvents !== undefined && s.ctrlEvents !== undefined
}

export function hasData(s: Study): boolean {
  return !!s.expTotal && !!s.ctrlTotal && s.expEvents !== undefined && s.ctrlEvents !== undefined
}

// per-study odds ratio with 95% CI (for the extraction table), regardless of include flag
export function studyEffect(s: Study): { or: number; low: number; high: number } | null {
  if (!hasData(s)) return null
  const { logor, se } = cells(s)
  return { or: Math.exp(logor), low: Math.exp(logor - 1.96 * se), high: Math.exp(logor + 1.96 * se) }
}

// upper-tail chi-square p-value via a small series (df ≥ 1) — approximate.
function chiSqP(x: number, df: number): number {
  if (x <= 0 || df < 1) return 1
  // Wilson–Hilferty approximation to the chi-square upper tail
  const t = Math.pow(x / df, 1 / 3)
  const m = 1 - 2 / (9 * df)
  const s = Math.sqrt(2 / (9 * df))
  const z = (t - m) / s
  // upper tail of standard normal
  return 0.5 * erfc(z / Math.SQRT2)
}
function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 1 / (1 + 0.5 * z)
  const r =
    t *
    Math.exp(
      -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    )
  return x >= 0 ? r : 2 - r
}

export function computeMeta(studies: Study[], model: 'random' | 'fixed'): MetaResult {
  const incl = studies.filter(usable)
  const raw = incl.map((s) => {
    const { logor, se } = cells(s)
    return { s, logor, se, w: 1 / (se * se) }
  })
  const k = raw.length
  if (k === 0) {
    return { rows: [], k: 0, pooledOR: 1, pooledLow: 1, pooledHigh: 1, Q: 0, df: 0, I2: 0, tau2: 0, model, pValue: 1 }
  }
  const sumW = raw.reduce((a, r) => a + r.w, 0)
  const fixedLog = raw.reduce((a, r) => a + r.w * r.logor, 0) / sumW
  const Q = raw.reduce((a, r) => a + r.w * (r.logor - fixedLog) ** 2, 0)
  const df = k - 1
  const C = sumW - raw.reduce((a, r) => a + r.w * r.w, 0) / sumW
  const tau2 = C > 0 ? Math.max(0, (Q - df) / C) : 0
  const I2 = Q > df ? Math.max(0, ((Q - df) / Q) * 100) : 0

  const wStar = raw.map((r) => (model === 'random' ? 1 / (r.se * r.se + tau2) : r.w))
  const sumWStar = wStar.reduce((a, b) => a + b, 0)
  const pooledLog = raw.reduce((a, r, i) => a + wStar[i] * r.logor, 0) / sumWStar
  const sePooled = Math.sqrt(1 / sumWStar)

  const rows: MetaRow[] = raw.map((r, i) => ({
    id: r.s.id,
    label: `${r.s.author} ${r.s.year}`,
    or: Math.exp(r.logor),
    low: Math.exp(r.logor - 1.96 * r.se),
    high: Math.exp(r.logor + 1.96 * r.se),
    logor: r.logor,
    se: r.se,
    weight: (wStar[i] / sumWStar) * 100,
    expEvents: r.s.expEvents ?? 0,
    expTotal: r.s.expTotal ?? 0,
    ctrlEvents: r.s.ctrlEvents ?? 0,
    ctrlTotal: r.s.ctrlTotal ?? 0,
  }))

  return {
    rows,
    k,
    pooledOR: Math.exp(pooledLog),
    pooledLow: Math.exp(pooledLog - 1.96 * sePooled),
    pooledHigh: Math.exp(pooledLog + 1.96 * sePooled),
    Q,
    df,
    I2,
    tau2,
    model,
    pValue: chiSqP(Q, df),
  }
}

export const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—')
