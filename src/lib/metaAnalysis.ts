import type { Study, EffectMeasure, Review, GradeJudgment } from '../types'

// ============================================================
// Meta-analysis engine. Supports four effect measures:
//   OR, RR  — ratio measures pooled on the log scale
//   RD      — risk difference, linear scale
//   SMD     — Hedges' g from continuous data, linear scale
// Inverse-variance fixed & DerSimonian–Laird random effects,
// Cochran's Q / I² / τ², leave-one-out, subgroup, Egger's test,
// and a GRADE certainty assessment.
// ============================================================

export const MEASURES: { id: EffectMeasure; label: string; scale: 'log' | 'linear'; ref: number; binary: boolean }[] = [
  { id: 'OR', label: 'Odds ratio', scale: 'log', ref: 1, binary: true },
  { id: 'RR', label: 'Risk ratio', scale: 'log', ref: 1, binary: true },
  { id: 'RD', label: 'Risk difference', scale: 'linear', ref: 0, binary: true },
  { id: 'SMD', label: "Std. mean diff (Hedges' g)", scale: 'linear', ref: 0, binary: false },
]
export const measureInfo = (m: EffectMeasure) => MEASURES.find((x) => x.id === m)!
const backTransform = (m: EffectMeasure, v: number) => (measureInfo(m).scale === 'log' ? Math.exp(v) : v)

export function hasBinary(s: Study): boolean {
  return !!s.expTotal && !!s.ctrlTotal && s.expEvents !== undefined && s.ctrlEvents !== undefined
}
export function hasCont(s: Study): boolean {
  return [s.mean1, s.sd1, s.n1, s.mean2, s.sd2, s.n2].every((v) => v !== undefined) && !!s.n1 && !!s.n2 && (s.sd1! > 0 || s.sd2! > 0)
}

// per-study effect on the pooling scale
function effectPool(s: Study, m: EffectMeasure): { pool: number; se: number } | null {
  if (m === 'SMD') {
    if (!hasCont(s)) return null
    const n1 = s.n1!, n2 = s.n2!
    const sp = Math.sqrt(((n1 - 1) * s.sd1! ** 2 + (n2 - 1) * s.sd2! ** 2) / (n1 + n2 - 2))
    if (!(sp > 0)) return null
    const d = (s.mean1! - s.mean2!) / sp
    const J = 1 - 3 / (4 * (n1 + n2) - 9) // Hedges' small-sample correction
    const g = d * J
    const se = Math.sqrt((n1 + n2) / (n1 * n2) + (g * g) / (2 * (n1 + n2)))
    return { pool: g, se }
  }
  if (!hasBinary(s)) return null
  const a = s.expEvents!, c = s.ctrlEvents!, n1 = s.expTotal!, n2 = s.ctrlTotal!
  const b = n1 - a, d = n2 - c
  if (m === 'OR') {
    let A = a, B = b, C = c, D = d
    if (A === 0 || B === 0 || C === 0 || D === 0) { A += 0.5; B += 0.5; C += 0.5; D += 0.5 }
    return { pool: Math.log((A * D) / (B * C)), se: Math.sqrt(1 / A + 1 / B + 1 / C + 1 / D) }
  }
  if (m === 'RR') {
    let A = a, C = c, N1 = n1, N2 = n2
    if (A === 0 || C === 0) { A += 0.5; C += 0.5; N1 += 1; N2 += 1 }
    return { pool: Math.log((A / N1) / (C / N2)), se: Math.sqrt(1 / A - 1 / N1 + 1 / C - 1 / N2) }
  }
  // RD
  const p1 = a / n1, p2 = c / n2
  return { pool: p1 - p2, se: Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2) }
}

export function usable(s: Study, m: EffectMeasure): boolean {
  return s.include && effectPool(s, m) !== null
}

// per-study effect + 95% CI (for the extraction table)
export function studyEffect(s: Study, m: EffectMeasure): { est: number; low: number; high: number } | null {
  const e = effectPool(s, m)
  if (!e) return null
  return { est: backTransform(m, e.pool), low: backTransform(m, e.pool - 1.96 * e.se), high: backTransform(m, e.pool + 1.96 * e.se) }
}

export interface MetaRow {
  id: string
  label: string
  est: number
  low: number
  high: number
  pool: number
  se: number
  weight: number
  expEvents: number
  expTotal: number
  ctrlEvents: number
  ctrlTotal: number
}
export interface MetaResult {
  rows: MetaRow[]
  k: number
  pooledEst: number
  pooledLow: number
  pooledHigh: number
  predLow: number // 95% prediction interval (random-effects, k≥3)
  predHigh: number
  pooledPool: number
  Q: number
  df: number
  I2: number
  tau2: number
  model: 'random' | 'fixed'
  pValue: number
  measure: EffectMeasure
  scale: 'log' | 'linear'
  refValue: number
}

export function computeMeta(studies: Study[], model: 'random' | 'fixed', measure: EffectMeasure): MetaResult {
  const info = measureInfo(measure)
  const raw = studies
    .filter((s) => s.include)
    .map((s) => ({ s, e: effectPool(s, measure) }))
    .filter((x): x is { s: Study; e: { pool: number; se: number } } => x.e !== null)
    .map((x) => ({ s: x.s, pool: x.e.pool, se: x.e.se, w: 1 / (x.e.se * x.e.se) }))
  const k = raw.length
  const base: Omit<MetaResult, 'rows' | 'pooledEst' | 'pooledLow' | 'pooledHigh' | 'predLow' | 'predHigh' | 'pooledPool' | 'Q' | 'I2' | 'tau2' | 'pValue' | 'k' | 'df'> = {
    model,
    measure,
    scale: info.scale,
    refValue: info.ref,
  }
  if (k === 0) return { ...base, rows: [], k: 0, pooledEst: info.ref, pooledLow: info.ref, pooledHigh: info.ref, predLow: info.ref, predHigh: info.ref, pooledPool: 0, Q: 0, df: 0, I2: 0, tau2: 0, pValue: 1 }

  const sumW = raw.reduce((a, r) => a + r.w, 0)
  const fixed = raw.reduce((a, r) => a + r.w * r.pool, 0) / sumW
  const Q = raw.reduce((a, r) => a + r.w * (r.pool - fixed) ** 2, 0)
  const df = k - 1
  const C = sumW - raw.reduce((a, r) => a + r.w * r.w, 0) / sumW
  const tau2 = C > 0 ? Math.max(0, (Q - df) / C) : 0
  const I2 = Q > df ? Math.max(0, ((Q - df) / Q) * 100) : 0
  const wStar = raw.map((r) => (model === 'random' ? 1 / (r.se * r.se + tau2) : r.w))
  const sumWStar = wStar.reduce((a, b) => a + b, 0)
  const pooledPool = raw.reduce((a, r, i) => a + wStar[i] * r.pool, 0) / sumWStar
  const sePooled = Math.sqrt(1 / sumWStar)
  // 95% prediction interval (Higgins–Thompson–Spiegelhalter): where a future
  // study's true effect is expected to fall. Only meaningful for random-effects, k≥3.
  let predLow = pooledPool - 1.96 * sePooled
  let predHigh = pooledPool + 1.96 * sePooled
  if (model === 'random' && k >= 3) {
    const tc = tCritTwoSided(k - 2)
    const sePI = Math.sqrt(tau2 + sePooled * sePooled)
    predLow = pooledPool - tc * sePI
    predHigh = pooledPool + tc * sePI
  }

  const rows: MetaRow[] = raw.map((r, i) => ({
    id: r.s.id,
    label: `${r.s.author} ${r.s.year}`,
    est: backTransform(measure, r.pool),
    low: backTransform(measure, r.pool - 1.96 * r.se),
    high: backTransform(measure, r.pool + 1.96 * r.se),
    pool: r.pool,
    se: r.se,
    weight: (wStar[i] / sumWStar) * 100,
    expEvents: r.s.expEvents ?? 0,
    expTotal: r.s.expTotal ?? r.s.n1 ?? 0,
    ctrlEvents: r.s.ctrlEvents ?? 0,
    ctrlTotal: r.s.ctrlTotal ?? r.s.n2 ?? 0,
  }))
  return {
    ...base,
    rows,
    k,
    pooledEst: backTransform(measure, pooledPool),
    pooledLow: backTransform(measure, pooledPool - 1.96 * sePooled),
    pooledHigh: backTransform(measure, pooledPool + 1.96 * sePooled),
    predLow: backTransform(measure, predLow),
    predHigh: backTransform(measure, predHigh),
    pooledPool,
    Q,
    df,
    I2,
    tau2,
    pValue: chiSqP(Q, df),
  }
}

export interface LooRow { excluded: string; k: number; est: number; low: number; high: number }
export function leaveOneOut(studies: Study[], model: 'random' | 'fixed', measure: EffectMeasure): LooRow[] {
  const incl = studies.filter((s) => usable(s, measure))
  if (incl.length < 3) return []
  return incl.map((s) => {
    const m = computeMeta(incl.filter((x) => x.id !== s.id), model, measure)
    return { excluded: `${s.author} ${s.year}`, k: m.k, est: m.pooledEst, low: m.pooledLow, high: m.pooledHigh }
  })
}

// two-sided t critical value (root-find on the two-tailed p, which decreases in t)
export function tCritTwoSided(df: number, alpha = 0.05): number {
  if (df < 1) return 1.96
  let lo = 0, hi = 100
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (tTwoTailedP(mid, df) > alpha) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// ---- cumulative meta-analysis (chronological) ----
export interface CumRow { label: string; year: number; k: number; est: number; low: number; high: number }
export function cumulativeMeta(studies: Study[], model: 'random' | 'fixed', measure: EffectMeasure): CumRow[] {
  const incl = studies.filter((s) => usable(s, measure)).slice().sort((a, b) => (a.year || 0) - (b.year || 0))
  if (incl.length < 2) return []
  return incl.map((s, i) => {
    const m = computeMeta(incl.slice(0, i + 1), model, measure)
    return { label: `+ ${s.author} ${s.year}`, year: s.year || 0, k: m.k, est: m.pooledEst, low: m.pooledLow, high: m.pooledHigh }
  })
}

// ---- meta-regression on a continuous moderator (weighted least squares) ----
const normCdf = (z: number) => 0.5 * erfc(-z / Math.SQRT2)
export interface MetaRegPoint { x: number; y: number; se: number; label: string }
export interface MetaRegResult {
  k: number
  slope: number // per unit moderator, on the pooling scale (log for OR/RR)
  seSlope: number
  intercept: number
  z: number
  p: number
  tau2: number
  scale: 'log' | 'linear'
  points: MetaRegPoint[]
  xMin: number
  xMax: number
}
export function metaRegression(
  studies: Study[],
  model: 'random' | 'fixed',
  measure: EffectMeasure,
  moderator: (s: Study) => number | null,
): MetaRegResult | null {
  const rows = studies
    .filter((s) => usable(s, measure))
    .map((s) => {
      const e = effectPool(s, measure)!
      const x = moderator(s)
      return x == null || !Number.isFinite(x) ? null : { x, y: e.pool, se: e.se, label: `${s.author} ${s.year}` }
    })
    .filter((r): r is MetaRegPoint => r !== null)
  const k = rows.length
  if (k < 3) return null
  const tau2 = model === 'random' ? computeMeta(studies, model, measure).tau2 : 0
  const w = rows.map((r) => 1 / (r.se * r.se + tau2))
  const sw = w.reduce((a, b) => a + b, 0)
  const mx = rows.reduce((a, r, i) => a + w[i] * r.x, 0) / sw
  const my = rows.reduce((a, r, i) => a + w[i] * r.y, 0) / sw
  const Sxx = rows.reduce((a, r, i) => a + w[i] * (r.x - mx) ** 2, 0)
  const Sxy = rows.reduce((a, r, i) => a + w[i] * (r.x - mx) * (r.y - my), 0)
  if (!(Sxx > 0)) return null
  const slope = Sxy / Sxx
  const intercept = my - slope * mx
  const seSlope = Math.sqrt(1 / Sxx)
  const z = slope / seSlope
  const xs = rows.map((r) => r.x)
  return { k, slope, seSlope, intercept, z, p: 2 * (1 - normCdf(Math.abs(z))), tau2, scale: measureInfo(measure).scale, points: rows, xMin: Math.min(...xs), xMax: Math.max(...xs) }
}

// ---- data-integrity checks ----
export interface IntegrityIssue { study: string; level: 'error' | 'warn'; msg: string }
export function dataIntegrity(studies: Study[], measure: EffectMeasure): IntegrityIssue[] {
  const out: IntegrityIssue[] = []
  for (const s of studies) {
    if (!s.include) continue
    const lbl = `${s.author} ${s.year}`
    if (measure === 'SMD') {
      if (!hasCont(s)) out.push({ study: lbl, level: 'warn', msg: 'no continuous data (mean/SD/n) for SMD' })
      continue
    }
    const a = s.expEvents, n1 = s.expTotal, c = s.ctrlEvents, n2 = s.ctrlTotal
    if (a !== undefined && n1 !== undefined && a > n1) out.push({ study: lbl, level: 'error', msg: `events (${a}) exceed the index-arm total (${n1})` })
    if (c !== undefined && n2 !== undefined && c > n2) out.push({ study: lbl, level: 'error', msg: `events (${c}) exceed the comparator total (${n2})` })
    if ([a, c, n1, n2].some((v) => v !== undefined && v < 0)) out.push({ study: lbl, level: 'error', msg: 'negative count' })
    if (!hasBinary(s)) {
      out.push({ study: lbl, level: 'warn', msg: `incomplete 2×2 data for ${measure}` })
      continue
    }
    if (a === 0 && c === 0) out.push({ study: lbl, level: 'warn', msg: 'double-zero events — no information for OR/RR' })
    else if (a === 0 || c === 0 || n1! - a! === 0 || n2! - c! === 0) out.push({ study: lbl, level: 'warn', msg: 'zero cell — 0.5 continuity correction applied' })
  }
  return out
}

export interface SubgroupResult {
  groups: { name: string; k: number; est: number; low: number; high: number; I2: number }[]
  Qbetween: number
  dfBetween: number
  pBetween: number
}
export function subgroupAnalysis(studies: Study[], model: 'random' | 'fixed', measure: EffectMeasure, key: (s: Study) => string): SubgroupResult {
  const incl = studies.filter((s) => usable(s, measure))
  const byGroup = new Map<string, Study[]>()
  incl.forEach((s) => {
    const g = key(s) || '—'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(s)
  })
  const detailed = [...byGroup.entries()].map(([name, arr]) => {
    const m = computeMeta(arr, model, measure)
    const se = (Math.log(Math.max(m.pooledHigh, 1e-6)) - Math.log(Math.max(m.pooledLow, 1e-6))) / (2 * 1.96)
    return { name, k: m.k, est: m.pooledEst, low: m.pooledLow, high: m.pooledHigh, I2: m.I2, pool: m.pooledPool, se: m.scale === 'log' ? se : (m.pooledHigh - m.pooledLow) / (2 * 1.96) }
  })
  const valid = detailed.filter((g) => Number.isFinite(g.se) && g.se > 0)
  const w = valid.map((g) => 1 / (g.se * g.se))
  const sumW = w.reduce((a, b) => a + b, 0)
  const overall = sumW > 0 ? valid.reduce((a, g, i) => a + w[i] * g.pool, 0) / sumW : 0
  const Qbetween = valid.reduce((a, g, i) => a + w[i] * (g.pool - overall) ** 2, 0)
  const dfBetween = Math.max(0, valid.length - 1)
  return {
    groups: detailed.map(({ pool, se, ...g }) => g),
    Qbetween,
    dfBetween,
    pBetween: dfBetween > 0 ? chiSqP(Qbetween, dfBetween) : 1,
  }
}

export interface EggerResult { intercept: number; se: number; t: number; p: number; k: number }
export function eggersTest(studies: Study[], measure: EffectMeasure): EggerResult | null {
  const incl = studies.filter((s) => usable(s, measure)).map((s) => effectPool(s, measure)!)
  const n = incl.length
  if (n < 3) return null
  const pts = incl.map((c) => ({ x: 1 / c.se, y: c.pool / c.se }))
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

// ---- Duval & Tweedie trim-and-fill (L0 estimator, iterative) ----
export interface TrimFillResult {
  k0: number
  fillSide: 'left' | 'right' | 'none'
  imputed: { pool: number; se: number }[]
  origEst: number
  adjustedPool: number
  adjustedEst: number
  adjustedLow: number
  adjustedHigh: number
}

function poolPairs(pairs: { pool: number; se: number }[], model: 'random' | 'fixed'): { pool: number; se: number } {
  const w = pairs.map((p) => 1 / (p.se * p.se))
  const sumW = w.reduce((a, b) => a + b, 0)
  const fixed = pairs.reduce((a, p, i) => a + w[i] * p.pool, 0) / sumW
  const Q = pairs.reduce((a, p, i) => a + w[i] * (p.pool - fixed) ** 2, 0)
  const df = pairs.length - 1
  const C = sumW - pairs.reduce((a, _p, i) => a + w[i] * w[i], 0) / sumW
  const tau2 = C > 0 ? Math.max(0, (Q - df) / C) : 0
  const wS = pairs.map((p) => (model === 'random' ? 1 / (p.se * p.se + tau2) : 1 / (p.se * p.se)))
  const sumWS = wS.reduce((a, b) => a + b, 0)
  const pooled = pairs.reduce((a, p, i) => a + wS[i] * p.pool, 0) / sumWS
  return { pool: pooled, se: Math.sqrt(1 / sumWS) }
}

export function trimAndFill(studies: Study[], model: 'random' | 'fixed', measure: EffectMeasure): TrimFillResult {
  const pairs = studies.filter((s) => usable(s, measure)).map((s) => effectPool(s, measure)!)
  const back = (x: number) => (measureInfo(measure).scale === 'log' ? Math.exp(x) : x)
  const orig = poolPairs(pairs.length ? pairs : [{ pool: 0, se: 1 }], model)
  const n = pairs.length
  const empty: TrimFillResult = { k0: 0, fillSide: 'none', imputed: [], origEst: back(orig.pool), adjustedPool: orig.pool, adjustedEst: back(orig.pool), adjustedLow: back(orig.pool - 1.96 * orig.se), adjustedHigh: back(orig.pool + 1.96 * orig.se) }
  if (n < 3) return empty

  const pools = pairs.map((p) => p.pool)
  const v = pairs.map((p) => p.se * p.se)
  const wmean = (idx: number[]) => {
    let sw = 0, swy = 0
    idx.forEach((i) => { const w = 1 / v[i]; sw += w; swy += w * pools[i] })
    return swy / sw
  }
  let mu = wmean(pools.map((_p, i) => i))
  let k0 = 0, prev = -1, heavy = 1, it = 0
  while (k0 !== prev && it < 100) {
    prev = k0; it++
    const res = pools.map((y, i) => ({ i, d: y - mu, rank: 0 }))
    ;[...res].sort((a, b) => Math.abs(a.d) - Math.abs(b.d)).forEach((r, k) => (r.rank = k + 1))
    const Tpos = res.filter((r) => r.d > 0).reduce((a, r) => a + r.rank, 0)
    const Tneg = res.filter((r) => r.d < 0).reduce((a, r) => a + r.rank, 0)
    heavy = Tpos >= Tneg ? 1 : -1
    const Tn = heavy > 0 ? Tpos : Tneg
    k0 = Math.max(0, Math.round((4 * Tn - n * (n + 1)) / (2 * n - 1)))
    const onHeavy = res.filter((r) => (heavy > 0 ? r.d > 0 : r.d < 0)).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    const trim = new Set(onHeavy.slice(0, k0).map((r) => r.i))
    const keep = pools.map((_p, i) => i).filter((i) => !trim.has(i))
    mu = wmean(keep.length ? keep : pools.map((_p, i) => i))
  }
  const res = pools.map((y, i) => ({ i, d: y - mu }))
  const onHeavy = res.filter((r) => (heavy > 0 ? r.d > 0 : r.d < 0)).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
  const imputed = onHeavy.slice(0, k0).map((r) => ({ pool: mu - (pools[r.i] - mu), se: pairs[r.i].se }))
  const adj = poolPairs([...pairs, ...imputed], model)
  return {
    k0,
    fillSide: k0 === 0 ? 'none' : heavy > 0 ? 'left' : 'right',
    imputed,
    origEst: back(orig.pool),
    adjustedPool: adj.pool,
    adjustedEst: back(adj.pool),
    adjustedLow: back(adj.pool - 1.96 * adj.se),
    adjustedHigh: back(adj.pool + 1.96 * adj.se),
  }
}

// ---- GRADE certainty of evidence ----
export interface GradeDomain { key: string; label: string; judgment: string; drop: number; auto: string }
export interface GradeResult {
  startLabel: string
  domains: GradeDomain[]
  upgrade: number
  upgradeLabel: string
  finalLevel: number
  certainty: 'High' | 'Moderate' | 'Low' | 'Very low'
}
const dropOf = (j: GradeJudgment) => (j === 'very serious' ? 2 : j === 'serious' ? 1 : 0)

export function autoGrade(review: Review, meta: MetaResult, egger: EggerResult | null) {
  const incl = review.studies.filter((s) => s.include)
  const highFrac = incl.length ? incl.filter((s) => Object.values(s.rob || {}).includes('high')).length / incl.length : 0
  const rob: GradeJudgment = highFrac > 0.5 ? 'very serious' : highFrac > 0 ? 'serious' : 'not serious'
  const inconsistency: GradeJudgment = meta.I2 >= 75 ? 'very serious' : meta.I2 >= 50 ? 'serious' : 'not serious'
  const crosses = meta.pooledLow < meta.refValue && meta.pooledHigh > meta.refValue
  const totalN = meta.rows.reduce((a, x) => a + x.expTotal + x.ctrlTotal, 0)
  const imprecision: GradeJudgment = crosses ? 'serious' : totalN < 400 ? 'serious' : 'not serious'
  const pubBias: 'undetected' | 'serious' = egger && egger.p < 0.05 ? 'serious' : 'undetected'
  let largeEffect: 'none' | 'large' | 'very large' = 'none'
  if ((review.grade?.design ?? 'observational') !== 'rct' && meta.scale === 'log' && !crosses) {
    const e = meta.pooledEst
    largeEffect = e >= 5 || e <= 0.2 ? 'very large' : e >= 2 || e <= 0.5 ? 'large' : 'none'
  }
  return { rob, inconsistency, indirectness: 'not serious' as GradeJudgment, imprecision, pubBias, largeEffect }
}

export function computeGrade(review: Review, meta: MetaResult, egger: EggerResult | null): GradeResult {
  const auto = autoGrade(review, meta, egger)
  const g = review.grade ?? { design: 'observational' as const }
  const design = g.design ?? 'observational'
  const start = design === 'rct' ? 4 : 2
  const rows: [string, string, GradeJudgment, string][] = [
    ['rob', 'Risk of bias', (g.rob ?? auto.rob) as GradeJudgment, auto.rob],
    ['inconsistency', 'Inconsistency', (g.inconsistency ?? auto.inconsistency) as GradeJudgment, auto.inconsistency],
    ['indirectness', 'Indirectness', (g.indirectness ?? auto.indirectness) as GradeJudgment, auto.indirectness],
    ['imprecision', 'Imprecision', (g.imprecision ?? auto.imprecision) as GradeJudgment, auto.imprecision],
  ]
  const domains: GradeDomain[] = rows.map(([key, label, judgment, autoV]) => ({ key, label, judgment, drop: dropOf(judgment), auto: autoV }))
  const pb = (g.pubBias ?? auto.pubBias) as string
  domains.push({ key: 'pubBias', label: 'Publication bias', judgment: pb, drop: pb === 'serious' ? 1 : 0, auto: auto.pubBias })
  const totalDrop = domains.reduce((a, d) => a + d.drop, 0)
  const up = (g.largeEffect ?? auto.largeEffect) as string
  const upgrade = design === 'rct' ? 0 : up === 'very large' ? 2 : up === 'large' ? 1 : 0
  const finalLevel = Math.max(1, Math.min(4, start - totalDrop + upgrade))
  const certainty = (['', 'Very low', 'Low', 'Moderate', 'High'][finalLevel] || 'Very low') as GradeResult['certainty']
  return { startLabel: design === 'rct' ? 'RCT (start: High)' : 'Observational (start: Low)', domains, upgrade, upgradeLabel: up, finalLevel, certainty }
}

// ---- statistics helpers ----
function chiSqP(x: number, df: number): number {
  if (x <= 0 || df < 1) return 1
  const t = Math.pow(x / df, 1 / 3)
  const m = 1 - 2 / (9 * df)
  const s = Math.sqrt(2 / (9 * df))
  return 0.5 * erfc((t - m) / s / Math.SQRT2)
}
function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 1 / (1 + 0.5 * z)
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))))
  return x >= 0 ? r : 2 - r
}
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
  const EPS = 3e-12, FPMIN = 1e-300
  const qab = a + b, qap = a + 1, qam = a - 1
  let c = 1, d = 1 - (qab * x) / qap
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
export function tTwoTailedP(t: number, df: number): number {
  if (df < 1) return 1
  return betai(df / 2, 0.5, df / (df + t * t))
}

export const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—')
