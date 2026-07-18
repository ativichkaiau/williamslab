// Diagnostic test-accuracy meta-analysis.
// Pools sensitivity & specificity on the logit scale (DerSimonian–Laird random
// effects) and fits a Moses–Littenberg summary ROC (SROC) curve — the standard
// pair for a test-accuracy review (here: ajmaline / type-1 ECG for Brugada).
import type { DiagnosticStudy } from '../types'

const invLogit = (x: number) => 1 / (1 + Math.exp(-x))

export interface DxRow {
  id: string
  label: string
  year: number
  test?: string
  tp: number
  fp: number
  fn: number
  tn: number
  n: number
  sens: number
  sensLow: number
  sensHigh: number
  spec: number
  specLow: number
  specHigh: number
  dor: number
  logitTpr: number // logit(sensitivity)
  logitFpr: number // logit(1 − specificity)
}

export interface DxSrocPoint {
  fpr: number
  tpr: number
}

export interface DxResult {
  k: number
  rows: DxRow[]
  sens: number
  sensLow: number
  sensHigh: number
  spec: number
  specLow: number
  specHigh: number
  lrPos: number
  lrNeg: number
  dor: number
  tau2Sens: number
  tau2Spec: number
  I2Sens: number
  I2Spec: number
  sroc: { a: number; b: number; auc: number; curve: DxSrocPoint[] } | null
}

export function dxUsable(s: DiagnosticStudy): boolean {
  const cells = [s.tp, s.fp, s.fn, s.tn]
  if (!s.include || cells.some((v) => v == null || !Number.isFinite(v) || (v as number) < 0)) return false
  return (s.tp! + s.fn!) > 0 && (s.tn! + s.fp!) > 0
}

// a proportion pos/(pos+neg) with a logit-scale 95% CI; 0.5 continuity
// correction only when a cell is empty (avoids ±∞ logits)
function prop(pos: number, neg: number) {
  const cc = pos === 0 || neg === 0 ? 0.5 : 0
  const a = pos + cc
  const b = neg + cc
  const lg = Math.log(a / b)
  const v = 1 / a + 1 / b
  const se = Math.sqrt(v)
  return { p: a / (a + b), low: invLogit(lg - 1.96 * se), high: invLogit(lg + 1.96 * se), logit: lg, v }
}

// DerSimonian–Laird pooling on a transformed (logit) scale
function poolLogit(ys: number[], vs: number[]) {
  const k = ys.length
  const wF = vs.map((v) => 1 / v)
  const sumWF = wF.reduce((a, b) => a + b, 0)
  const muF = ys.reduce((a, y, i) => a + wF[i] * y, 0) / sumWF
  const Q = ys.reduce((a, y, i) => a + wF[i] * (y - muF) ** 2, 0)
  const df = k - 1
  const C = sumWF - wF.reduce((a, w) => a + w * w, 0) / sumWF
  const tau2 = C > 0 ? Math.max(0, (Q - df) / C) : 0
  const wR = vs.map((v) => 1 / (v + tau2))
  const sumWR = wR.reduce((a, b) => a + b, 0)
  const mu = ys.reduce((a, y, i) => a + wR[i] * y, 0) / sumWR
  const se = Math.sqrt(1 / sumWR)
  const I2 = Q > df ? Math.max(0, ((Q - df) / Q) * 100) : 0
  return { est: mu, low: mu - 1.96 * se, high: mu + 1.96 * se, tau2, I2 }
}

// Moses–Littenberg SROC: regress D = a + b·S where D = ln(DOR) and
// S = logit(TPR) + logit(FPR) is a proxy for test threshold (OLS, unweighted).
function fitSroc(rows: DxRow[]): DxResult['sroc'] {
  if (rows.length < 3) return null
  const D = rows.map((r) => r.logitTpr - r.logitFpr)
  const S = rows.map((r) => r.logitTpr + r.logitFpr)
  const n = rows.length
  const mS = S.reduce((a, b) => a + b, 0) / n
  const mD = D.reduce((a, b) => a + b, 0) / n
  const Sxx = S.reduce((a, s) => a + (s - mS) ** 2, 0)
  const Sxy = S.reduce((a, s, i) => a + (s - mS) * (D[i] - mD), 0)
  const b = Sxx > 1e-9 ? Sxy / Sxx : 0
  const a = mD - b * mS
  // back-transform: logit(TPR) = a/(1−b) + ((1+b)/(1−b))·logit(FPR)
  const denom = Math.abs(1 - b) < 1e-6 ? (1 - b < 0 ? -1e-6 : 1e-6) : 1 - b
  const curve: DxSrocPoint[] = []
  let auc = 0
  let prev: DxSrocPoint | null = null
  for (let i = 0; i <= 100; i++) {
    const fpr = Math.min(0.999, Math.max(0.001, i / 100))
    const logitFpr = Math.log(fpr / (1 - fpr))
    const tpr = invLogit(a / denom + ((1 + b) / denom) * logitFpr)
    const pt = { fpr, tpr }
    if (prev) auc += ((pt.tpr + prev.tpr) / 2) * (pt.fpr - prev.fpr)
    curve.push(pt)
    prev = pt
  }
  return { a, b, auc: Math.min(1, Math.max(0, auc)), curve }
}

export function diagnosticMeta(studies: DiagnosticStudy[] | undefined): DxResult | null {
  const incl = (studies ?? []).filter(dxUsable)
  if (incl.length < 2) return null
  const rows: DxRow[] = incl.map((s) => {
    const tp = s.tp!, fp = s.fp!, fn = s.fn!, tn = s.tn!
    const se = prop(tp, fn) // sensitivity = TP / (TP + FN)
    const sp = prop(tn, fp) // specificity = TN / (TN + FP)
    const fpr = prop(fp, tn) // false-positive rate = FP / (FP + TN)
    const ccOdds = tp === 0 || fp === 0 || fn === 0 || tn === 0
    const dor = ccOdds ? ((tp + 0.5) * (tn + 0.5)) / ((fp + 0.5) * (fn + 0.5)) : (tp * tn) / (fp * fn)
    return {
      id: s.id, label: `${s.author} ${s.year}`, year: s.year, test: s.test,
      tp, fp, fn, tn, n: tp + fp + fn + tn,
      sens: se.p, sensLow: se.low, sensHigh: se.high,
      spec: sp.p, specLow: sp.low, specHigh: sp.high,
      dor,
      logitTpr: se.logit, logitFpr: fpr.logit,
    }
  })

  const sensPool = poolLogit(rows.map((r) => prop(r.tp, r.fn).logit), rows.map((r) => prop(r.tp, r.fn).v))
  const specPool = poolLogit(rows.map((r) => prop(r.tn, r.fp).logit), rows.map((r) => prop(r.tn, r.fp).v))
  const sens = invLogit(sensPool.est), spec = invLogit(specPool.est)
  const lrPos = spec < 1 ? sens / (1 - spec) : Infinity
  const lrNeg = spec > 0 ? (1 - sens) / spec : Infinity
  const dor = lrNeg > 0 && Number.isFinite(lrPos) ? lrPos / lrNeg : Infinity

  return {
    k: rows.length,
    rows,
    sens, sensLow: invLogit(sensPool.low), sensHigh: invLogit(sensPool.high),
    spec, specLow: invLogit(specPool.low), specHigh: invLogit(specPool.high),
    lrPos, lrNeg, dor,
    tau2Sens: sensPool.tau2, tau2Spec: specPool.tau2,
    I2Sens: sensPool.I2, I2Spec: specPool.I2,
    sroc: fitSroc(rows),
  }
}
