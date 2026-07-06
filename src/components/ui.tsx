import type { AssayStatus, HypothesisStatus, Severity } from '../types'
import { SEVERITY_COLOR } from '../lib/palette'

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="kicker">
      <span className="dot" />
      {children}
    </span>
  )
}

export function Rule() {
  return (
    <span className="rule">
      <i className="b" />
      <i className="r" />
      <i className="y" />
    </span>
  )
}

const ASSAY_CLASS: Record<AssayStatus, string> = {
  design: 'b-design',
  queued: 'b-queue',
  piloting: 'b-pilot',
  running: 'b-run',
  done: 'b-done',
  blocked: 'b-block',
}

export function AssayBadge({ status }: { status: AssayStatus }) {
  return <span className={`badge ${ASSAY_CLASS[status]}`}>{status}</span>
}

const HYP_CLASS: Record<HypothesisStatus, string> = {
  draft: 'b-draft',
  testing: 'b-testing',
  supported: 'b-supported',
  refuted: 'b-refuted',
}

export function HypBadge({ status }: { status: HypothesisStatus }) {
  return <span className={`badge ${HYP_CLASS[status]}`}>{status}</span>
}

export function SevDot({ severity, label }: { severity: Severity; label?: string }) {
  return (
    <span className="sev" style={{ color: SEVERITY_COLOR[severity] }}>
      <i style={{ background: SEVERITY_COLOR[severity] }} />
      {label ?? severity}
    </span>
  )
}

export function StatCard({ value, label, sub, tone }: { value: React.ReactNode; label: string; sub?: string; tone?: string }) {
  return (
    <div className="stat" style={tone ? { borderTopColor: tone } : undefined}>
      <b style={tone ? { color: tone } : undefined}>{value}</b>
      <span>{label}</span>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}
