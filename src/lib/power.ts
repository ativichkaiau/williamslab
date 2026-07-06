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

/** Power of a two-sided two-sample test, equal n per group. */
export function twoSampleTPower({ nPerGroup, d, alpha }: { nPerGroup: number; d: number; alpha: number }): number {
  if (nPerGroup < 2 || d <= 0) return 0
  const zcrit = invNorm(1 - alpha / 2)
  const ncp = d * Math.sqrt(nPerGroup / 2)
  return clamp01(normalCdf(ncp - zcrit) + normalCdf(-ncp - zcrit))
}

/** Required n per group to reach a target power. */
export function requiredNPerGroup({ d, alpha, power }: { d: number; alpha: number; power: number }): number {
  if (d <= 0) return Infinity
  const z = invNorm(1 - alpha / 2) + invNorm(power)
  return Math.max(2, Math.ceil((2 * (z / d) * (z / d))))
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
