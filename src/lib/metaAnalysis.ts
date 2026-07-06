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

// ---- per-study log-OR / SE (for Egger, subgroups) ----
export function studyLogSE(s: Study): { logor: number; se: number } | null {
  if (!hasData(s)) return null
  return cells(s)
}

// ---- leave-one-out sensitivity analysis ----
export interface LooRow {
  excluded: string
  k: number
  pooledOR: number
  low: number
  high: number
}
export function leaveOneOut(studies: Study[], model: 'random' | 'fixed'): LooRow[] {
  const incl = studies.filter(usable)
  if (incl.length < 3) return []
  return incl.map((s) => {
    const m = computeMeta(incl.filter((x) => x.id !== s.id), model)
    return { excluded: `${s.author} ${s.year}`, k: m.k, pooledOR: m.pooledOR, low: m.pooledLow, high: m.pooledHigh }
  })
}

// ---- subgroup analysis ----
export interface SubgroupResult {
  groups: { name: string; k: number; pooledOR: number; low: number; high: number; I2: number }[]
  Qbetween: number
  dfBetween: number
  pBetween: number
}
export function subgroupAnalysis(studies: Study[], model: 'random' | 'fixed', key: (s: Study) => string): SubgroupResult {
  const incl = studies.filter(usable)
  const byGroup = new Map<string, Study[]>()
  incl.forEach((s) => {
    const g = key(s) || '—'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(s)
  })
  const detailed = [...byGroup.entries()].map(([name, arr]) => {
    const m = computeMeta(arr, model)
    const logor = Math.log(m.pooledOR)
    const se = (Math.log(m.pooledHigh) - Math.log(m.pooledLow)) / (2 * 1.96)
    return { name, k: m.k, pooledOR: m.pooledOR, low: m.pooledLow, high: m.pooledHigh, I2: m.I2, logor, se }
  })
  const valid = detailed.filter((g) => Number.isFinite(g.se) && g.se > 0)
  const w = valid.map((g) => 1 / (g.se * g.se))
  const sumW = w.reduce((a, b) => a + b, 0)
  const overall = sumW > 0 ? valid.reduce((a, g, i) => a + w[i] * g.logor, 0) / sumW : 0
  const Qbetween = valid.reduce((a, g, i) => a + w[i] * (g.logor - overall) ** 2, 0)
  const dfBetween = Math.max(0, valid.length - 1)
  return {
    groups: detailed.map(({ logor, se, ...g }) => g),
    Qbetween,
    dfBetween,
    pBetween: dfBetween > 0 ? chiSqP(Qbetween, dfBetween) : 1,
  }
}

// ---- Egger's regression test for small-study effects ----
export interface EggerResult {
  intercept: number
  se: number
  t: number
  p: number
  k: number
}
export function eggersTest(studies: Study[]): EggerResult | null {
  const incl = studies.filter(usable).map(cells)
  const n = incl.length
  if (n < 3) return null
  // OLS of the standard normal deviate (logOR/SE) on precision (1/SE)
  const pts = incl.map((c) => ({ x: 1 / c.se, y: c.logor / c.se }))
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0)
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const b = (n * sxy - sx * sy) / denom
  const a = (sy - b * sx) / n
  const resid = pts.map((p) => p.y - (a + b * p.x))
  const s2 = resid.reduce((s, r) => s + r * r, 0) / (n - 2)
  const seA = Math.sqrt((s2 * sxx) / denom)
  const t = a / seA
  return { intercept: a, se: seA, t, p: tTwoTailedP(t, n - 2), k: n }
}

// ---- t / beta helpers (Numerical Recipes) ----
function gammaln(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += c[j] / ++y
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}
function betacf(a: number, b: number, x: number): number {
  const EPS = 3e-12
  const FPMIN = 1e-300
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b
}
// two-tailed p-value for a t statistic with df degrees of freedom
export function tTwoTailedP(t: number, df: number): number {
  if (df < 1) return 1
  return betai(df / 2, 0.5, df / (df + t * t))
}
