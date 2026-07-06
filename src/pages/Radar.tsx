import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'

const STANCE_CLASS: Record<string, string> = {
  supports: 'b-supported',
  refutes: 'b-refuted',
  background: 'b-draft',
}

export default function Radar() {
  const { state } = useStore()
  const hypLabel = (id: string) => state.hypotheses.find((h) => h.id === id)?.label.split('·')[0].trim() ?? id
  const gaps = state.hypotheses.filter((h) => !h.supportingPapers || h.supportingPapers.length === 0)

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>LITERATURE RADAR · FIELD SIGNAL</Kicker>
        <h1>Literature Radar</h1>
        <p>What supports you, what contradicts you, and where the map has holes. Identifiers are slots to fill — this is a planning surface, not asserted citations.</p>
      </div>

      <div className="graph-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Year</th>
                <th>Stance</th>
                <th>Targets</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {state.papers.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.title}</b><div className="small mono">{p.pmid ? `PMID ${p.pmid}` : 'PMID —'} · {p.doi ?? 'DOI —'}</div></td>
                  <td className="mono">{p.year ?? '—'}</td>
                  <td><span className={`badge ${STANCE_CLASS[p.stance ?? 'background']}`}>{p.stance ?? 'background'}</span></td>
                  <td className="wrap-gap">{(p.targets ?? []).map((t) => <span className="chip" key={t}>{hypLabel(t)}</span>)}</td>
                  <td className="wrap-gap">{(p.tags ?? []).map((t) => <span className="pill" key={t}>{t}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--amber)' }}>
          <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />GAP MAP</div>
          {gaps.length === 0 ? (
            <p className="empty">Every hypothesis has literature on record.</p>
          ) : (
            <>
              <p className="small" style={{ marginBottom: 10 }}>Hypotheses with no supporting reference linked — novelty and prior art unverified:</p>
              {gaps.map((h) => (
                <div className="list-item" key={h.id}>
                  <span className="ic" style={{ color: 'var(--amber)' }}>▲</span>
                  <span>{h.label}</span>
                </div>
              ))}
            </>
          )}
          <div className="divider" />
          <p className="small">v1 imports references manually; v1.x adds PubMed E-utilities auto-ingestion and contradiction ranking.</p>
        </div>
      </div>
    </>
  )
}
