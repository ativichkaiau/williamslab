import type { Assay } from '../types'

// ============================================================
// Statistical power — "downforce".
// Two-sample comparison (patient vs control) on a continuous
// readout, normal approximation to the t-test. Good enough for
// planning; the point is to make the underpowered sensor
// quantitative rather than a hard n threshold.
// ============================================================

// Abramowitz & Stegun 7.1.26 error function.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return x >= 0 ? y : -y
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

// Acklam's inverse normal CDF.
export function invNorm(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const plow = 0.02425
  const phigh = 1 - plow
  let q: number, r: number
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p <= phigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Power of a two-sided two-sample test. `alloc` = n₂/n₁ (1 = equal groups). */
export function twoSampleTPower({ nPerGroup, d, alpha, alloc = 1 }: { nPerGroup: number; d: number; alpha: number; alloc?: number }): number {
  if (nPerGroup < 2 || d <= 0) return 0
  const zcrit = invNorm(1 - alpha / 2)
  const ncp = d * Math.sqrt((nPerGroup * alloc) / (alloc + 1))
  return clamp01(normalCdf(ncp - zcrit) + normalCdf(-ncp - zcrit))
}

// ---- chi-square helpers (Wilson–Hilferty normal approximation) ----
function pchisq(x: number, df: number): number {
  if (x <= 0) return 0
  const t = Math.cbrt(x / df)
  return normalCdf((t - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df)))
}
function qchisq(p: number, df: number): number {
  const z = invNorm(p)
  const v = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df))
  return df * v * v * v
}

/** Paired t-test, n pairs, effect size dz on the within-pair differences. */
export function pairedPower({ nPairs, d, alpha }: { nPairs: number; d: number; alpha: number }): number {
  if (nPairs < 2 || d <= 0) return 0
  const zcrit = invNorm(1 - alpha / 2)
  const ncp = d * Math.sqrt(nPairs)
  return clamp01(normalCdf(ncp - zcrit) + normalCdf(-ncp - zcrit))
}
export function requiredNPaired({ d, alpha, power }: { d: number; alpha: number; power: number }): number {
  if (d <= 0) return Infinity
  const z = invNorm(1 - alpha / 2) + invNorm(power)
  return Math.max(2, Math.ceil((z / d) * (z / d)))
}

/** One-way ANOVA omnibus, k groups × n, Cohen's f. Patnaik χ² approx to the
 *  noncentral F (a planning approximation; slightly optimistic at small df₂). */
export function anovaPower({ k, nPerGroup, f, alpha }: { k: number; nPerGroup: number; f: number; alpha: number }): number {
  if (k < 2 || nPerGroup < 2 || f <= 0) return 0
  const df1 = k - 1
  const lambda = f * f * k * nPerGroup
  const crit = qchisq(1 - alpha, df1)
  const c = (df1 + 2 * lambda) / (df1 + lambda)
  const h = ((df1 + lambda) * (df1 + lambda)) / (df1 + 2 * lambda)
  return clamp01(1 - pchisq(crit / c, h))
}
export function requiredNAnova({ k, f, alpha, power }: { k: number; f: number; alpha: number; power: number }): number {
  if (f <= 0) return Infinity
  for (let n = 2; n <= 100000; n++) if (anovaPower({ k, nPerGroup: n, f, alpha }) >= power) return n
  return Infinity
}

/** Log-rank (Schoenfeld), power from the number of observed events; 1:1 arms. */
export function logRankPower({ events, hr, alpha }: { events: number; hr: number; alpha: number }): number {
  if (events < 2 || hr <= 0 || hr === 1) return 0
  const zcrit = invNorm(1 - alpha / 2)
  return clamp01(normalCdf((Math.abs(Math.log(hr)) * Math.sqrt(events)) / 2 - zcrit))
}
export function requiredEvents({ hr, alpha, power }: { hr: number; alpha: number; power: number }): number {
  if (hr <= 0 || hr === 1) return Infinity
  const z = invNorm(1 - alpha / 2) + invNorm(power)
  return Math.max(4, Math.ceil((4 * z * z) / (Math.log(hr) * Math.log(hr))))
}

/** BH-FDR planning per-test α (Jung 2005): m tests, m1 true alternatives,
 *  target FDR q at the planned power. Less conservative than Bonferroni. */
export function fdrAlpha({ m, m1, q, power }: { m: number; m1: number; q: number; power: number }): number {
  const m0 = Math.max(0, m - m1)
  if (m1 <= 0 || m0 <= 0 || q <= 0 || q >= 1) return q
  return Math.min(1, (q * m1 * power) / (m0 * (1 - q)))
}

/** Approximate Cohen's d from a pooled meta-analysis estimate (for planning). */
export function dFromMeta(measure: string, est: number): number {
  const SQRT3_OVER_PI = Math.sqrt(3) / Math.PI
  if (measure === 'SMD') return Math.abs(est)
  if (measure === 'OR' || measure === 'RR') return Math.abs(Math.log(est)) * SQRT3_OVER_PI // Chinn/Hasselblad–Hedges
  if (measure === 'RD') return Math.min(1.2, Math.abs(est) * 2) // crude
  return 0.5
}

/** Required n in the reference group (group 1) to reach target power.
 *  `alloc` = n₂/n₁; at 1:1 this is the classic 2·(z/d)² per group. */
export function requiredNPerGroup({ d, alpha, power, alloc = 1 }: { d: number; alpha: number; power: number; alloc?: number }): number {
  if (d <= 0) return Infinity
  const z = invNorm(1 - alpha / 2) + invNorm(power)
  return Math.max(2, Math.ceil(((alloc + 1) / alloc) * (z / d) * (z / d)))
}

const DEFAULT_GENOME_WIDE_TESTS = 1e5

export interface PowerReport {
  nPerGroup: number
  d: number
  alpha: number // per-test alpha actually used
  baseAlpha: number // 0.05 before correction
  tests: number // simultaneous tests
  power: number
  requiredNPerGroup: number
  requiredTotalN: number
  adequate: boolean
}

/** Effective per-test alpha after multiple-testing correction. */
export function effectiveAlpha(assay: Pick<Assay, 'genomeWide' | 'genomeWideTests'>, baseAlpha = 0.05): { alpha: number; tests: number } {
  const tests = assay.genomeWide ? assay.genomeWideTests ?? DEFAULT_GENOME_WIDE_TESTS : 1
  return { alpha: baseAlpha / tests, tests }
}

export function defaultEffect(assay: Pick<Assay, 'expectedEffect' | 'genomeWide'>): number {
  return assay.expectedEffect ?? (assay.genomeWide ? 0.8 : 1.0)
}

/** Full power read-out for one assay, targeting 80% power. */
export function assayPowerReport(assay: Assay, targetPower = 0.8): PowerReport | null {
  if (assay.sampleN === undefined) return null
  const nPerGroup = Math.floor(assay.sampleN / 2)
  const d = defaultEffect(assay)
  const { alpha, tests } = effectiveAlpha(assay)
  const power = twoSampleTPower({ nPerGroup, d, alpha })
  const reqPer = requiredNPerGroup({ d, alpha, power: targetPower })
  return {
    nPerGroup,
    d,
    alpha,
    baseAlpha: 0.05,
    tests,
    power,
    requiredNPerGroup: reqPer,
    requiredTotalN: reqPer * 2,
    adequate: power >= targetPower,
  }
}

export function fmtAlpha(a: number): string {
  if (a >= 0.001) return a.toFixed(3)
  return a.toExponential(1)
}
