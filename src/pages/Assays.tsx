import { useStore } from '../lib/store'
import { Kicker, Rule, AssayBadge, SevDot } from '../components/ui'
import { INSTABILITY_LABEL } from '../lib/palette'

export default function Assays() {
  const { state, instabilities } = useStore()
  const hypLabel = (id: string) => state.hypotheses.find((h) => h.id === id)?.label.split('·')[0].trim() ?? id
  const flagsFor = (assayId: string) => instabilities.filter((i) => i.target === assayId && i.status === 'open')

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>ASSAY PLANNER · CLAIM ↔ ASSAY MATRIX</Kicker>
        <h1>Assays</h1>
        <p>Each assay is bound to the hypotheses it addresses and the cell type it runs in. The active-suspension array audits controls, power, and tissue match in the right-hand column.</p>
      </div>

      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>
              <th>Assay</th>
              <th>Measures</th>
              <th>Cell type</th>
              <th>Controls</th>
              <th>n</th>
              <th>Phase</th>
              <th>Status</th>
              <th>Claims</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {state.assays.map((a) => {
              const flags = flagsFor(a.id)
              return (
                <tr key={a.id}>
                  <td><b>{a.method}</b>{a.genomeWide && <div className="small">genome-wide</div>}</td>
                  <td className="muted">{a.measures}</td>
                  <td className="muted">{a.cellType}</td>
                  <td className={a.controls ? 'muted' : ''} style={a.controls ? undefined : { color: 'var(--red)', fontWeight: 700 }}>
                    {a.controls || 'none'}
                  </td>
                  <td className="mono">{a.sampleN ?? '—'}</td>
                  <td className="mono">{a.phase ?? '—'}</td>
                  <td><AssayBadge status={a.status} /></td>
                  <td className="wrap-gap">{(a.claims ?? []).map((c) => <span className="chip" key={c}>{hypLabel(c)}</span>)}</td>
                  <td>
                    {flags.length === 0 ? (
                      <span className="small" style={{ color: 'var(--green)' }}>clear</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {flags.map((f) => (
                          <SevDot key={f.id} severity={f.severity} label={INSTABILITY_LABEL[f.type]} />
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
