import { useStore } from '../lib/store'
import { Kicker, Rule, AssayBadge } from '../components/ui'

const MOLECULAR = [
  { name: 'DNA methylation', fill: 70, v: 'RRBS · pilot' },
  { name: 'H3K27me3 (repressive)', fill: 30, v: 'CUT&Tag' },
  { name: 'H3K4me3 / H3K27ac', fill: 30, v: 'CUT&Tag' },
  { name: 'Chromatin accessibility', fill: 22, v: 'ATAC' },
  { name: '3D looping @ SCN5A', fill: 12, v: '4C · design' },
  { name: 'ncRNA / miRNA', fill: 40, v: 'small-RNA' },
  { name: 'Nav1.5 mRNA / protein', fill: 55, v: 'qPCR/WB' },
]

const CLINICAL = [
  { name: 'ECG type (1/2/3)', fill: 80, v: 'primary' },
  { name: 'Spontaneous vs induced', fill: 65, v: 'stratifier' },
  { name: 'SCN5A mutation status', fill: 60, v: '± split' },
  { name: 'PR / QRS duration', fill: 50, v: 'conduction' },
  { name: 'Arrhythmic events', fill: 45, v: 'outcome' },
]

const OUTPUTS = [
  'Differentially-methylated-region atlas at Na⁺-channel loci',
  'Histone / accessibility map + methylation–expression correlation',
  'Candidate ncRNA panel + functional iPSC-CM validation',
  'Precision-medicine biomarker score for risk stratification',
]

export default function PitWall() {
  const { state, instabilities } = useStore()
  const open = instabilities.filter((i) => i.status === 'open')
  const bottlenecks = [...open].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 4)
  const actions = [...open].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 4)

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
            <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />MOLECULAR AXES</div>
            {MOLECULAR.map((a) => (
              <div className="axis" key={a.name}>
                <span className="name">{a.name}</span>
                <span className="bar"><i style={{ width: `${a.fill}%`, background: 'var(--blue)' }} /></span>
                <span className="v">{a.v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-h"><span className="sq" style={{ background: 'var(--red)' }} />CLINICAL PHENOTYPE AXES</div>
            {CLINICAL.map((a) => (
              <div className="axis" key={a.name}>
                <span className="name">{a.name}</span>
                <span className="bar"><i style={{ width: `${a.fill}%`, background: 'var(--red)' }} /></span>
                <span className="v">{a.v}</span>
              </div>
            ))}
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
            {bottlenecks.map((b) => (
              <div className="list-item" key={b.id}>
                <span className="ic" style={{ color: 'var(--red)' }}>▲</span>
                <span>{b.signal}</span>
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

function sevRank(s: 'low' | 'med' | 'high') {
  return s === 'high' ? 3 : s === 'med' ? 2 : 1
}
