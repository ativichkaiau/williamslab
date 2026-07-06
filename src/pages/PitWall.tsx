import { useStore } from '../lib/store'
import { Kicker, Rule, AssayBadge } from '../components/ui'
import type { AssayStatus } from '../types'

// assay status → a real progress reading (no placeholder numbers)
const STATUS_PCT: Record<AssayStatus, number> = { design: 12, queued: 30, piloting: 55, running: 80, done: 100, blocked: 42 }

// each molecular axis is backed by the assay(s) that measure it
const MOL_AXES: { name: string; assays: string[] }[] = [
  { name: 'DNA methylation', assays: ['assay_pyroseq', 'assay_rrbs'] },
  { name: 'Histone marks (H3K27me3/ac)', assays: ['assay_cuttag'] },
  { name: 'Chromatin accessibility', assays: ['assay_atac'] },
  { name: '3D looping @ SCN5A', assays: ['assay_4c'] },
  { name: 'ncRNA / miRNA', assays: ['assay_smallrna'] },
  { name: 'Nav1.5 expression', assays: ['assay_rnaseq'] },
  { name: 'Function (I_Na / CV)', assays: ['assay_patch'] },
]

const CLIN_STRATIFIERS = [
  'ECG type (1 / 2 / 3)',
  'Spontaneous vs drug-induced type-1',
  'SCN5A mutation status (±)',
  'PR interval / QRS duration',
  'Arrhythmic events (VT / VF / SCD)',
  'Symptom status',
]

const OUTPUTS = [
  'Differentially-methylated-region map at SCN5A / SCN10A',
  'Histone & accessibility landscape (CUT&Tag + ATAC)',
  'Methylation–expression correlation for Nav1.5',
  'Candidate ncRNA panel + iPSC-CM functional validation',
  'Precision-medicine biomarker score for risk stratification',
]

function sevRank(s: 'low' | 'med' | 'high') {
  return s === 'high' ? 3 : s === 'med' ? 2 : 1
}

export default function PitWall() {
  const { state, instabilities } = useStore()
  const open = instabilities.filter((i) => i.status === 'open')
  const bottlenecks = [...open].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 4)
  const actions = [...open].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 4)

  // derive each molecular axis from the real status of its backing assays
  const molecular = MOL_AXES.map((ax) => {
    const backing = state.assays.filter((a) => ax.assays.includes(a.id))
    const best = backing.reduce<{ pct: number; status: AssayStatus | null }>(
      (acc, a) => (STATUS_PCT[a.status] >= acc.pct ? { pct: STATUS_PCT[a.status], status: a.status } : acc),
      { pct: 0, status: null },
    )
    return { name: ax.name, pct: best.pct, status: best.status }
  })

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>PROJECT DASHBOARD</Kicker>
        <h1>Brugada program — the whole project at a glance</h1>
      </div>

      <div className="grid g2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />CENTRAL HYPOTHESIS</div>
            <p className="hyp-quote">{state.project.centralHypothesis}</p>
          </div>

          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />MOLECULAR AXES · progress from assay status</div>
            {molecular.map((a) => (
              <div className="axis" key={a.name}>
                <span className="name">{a.name}</span>
                <span className="bar"><i style={{ width: `${a.pct}%`, background: 'var(--blue)' }} /></span>
                <span className="v">{a.status ?? '—'}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--red)' }} />CLINICAL STRATIFIERS</div>
            <div className="wrap-gap">
              {CLIN_STRATIFIERS.map((c) => <span className="pill" key={c}>{c}</span>)}
            </div>
            <p className="small" style={{ marginTop: 12 }}>Phenotype axes the cohort is stratified by for genotype–epigenotype–phenotype correlation.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--green)' }} />PLANNED ASSAYS</div>
            {state.assays.map((a) => (
              <div className="stint" key={a.id}>
                <div>
                  <div className="nm">{a.method}</div>
                  <div className="meta">{a.measures} · n={a.sampleN ?? '—'}</div>
                </div>
                <AssayBadge status={a.status} />
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--green)' }} />EXPECTED OUTPUTS</div>
            {OUTPUTS.map((o) => (
              <div className="list-item" key={o}>
                <span className="ic" style={{ color: 'var(--green)' }}>✓</span>
                <span>{o}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />CURRENT BOTTLENECKS</div>
            {bottlenecks.length === 0 && <p className="empty">No open issues.</p>}
            {bottlenecks.map((b) => (
              <div className="list-item" key={b.id}>
                <span className="ic" style={{ color: 'var(--red)' }}>▲</span>
                <span>{b.signal} <span className="small">— {b.targetLabel}</span></span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />RECOMMENDED NEXT STEPS</div>
            {actions.map((a, idx) => (
              <div className="action" key={a.id}>
                <div className="n">{idx + 1}</div>
                <div className="tx">
                  <b>{a.repair}</b>
                  <span>{a.targetLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
