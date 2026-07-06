import { useStore } from '../lib/store'
import { Kicker, Rule, HypBadge, SevDot } from '../components/ui'
import { INSTABILITY_LABEL } from '../lib/palette'

export default function Hypotheses() {
  const { state, instabilities } = useStore()
  const paperTitle = (id: string) => state.papers.find((p) => p.id === id)?.title ?? id

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>HYPOTHESIS GRAPH · FALSIFIABLE CLAIMS</Kicker>
        <h1>Hypotheses</h1>
        <p>Every claim carries a predicted direction, an effect size, and the observation that would kill it. Flags below each card come live from the active-suspension array.</p>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        {state.hypotheses.map((h) => {
          const flags = instabilities.filter((i) => i.target === h.id && i.status === 'open')
          return (
            <div className="card lg hcard" key={h.id}>
              <div className="flex">
                <h3 style={{ fontSize: 17 }}>{h.label}</h3>
                <span className="spacer" />
                <HypBadge status={h.status} />
              </div>
              <p className="st">{h.statement}</p>

              <div className="kv"><span className="k">Prediction</span><span className="val">{h.prediction ? `${h.prediction.direction} · ${h.prediction.effect ?? '—'}` : '— none set —'}</span></div>
              <div className="kv"><span className="k">Falsified if</span><span className="val">{h.falsification ?? <em style={{ color: 'var(--red)' }}>no criterion set</em>}</span></div>
              <div className="kv"><span className="k">Requires</span><span className="val">{h.requiresTissue ?? 'any tissue'}</span></div>
              <div className="kv">
                <span className="k">Support</span>
                <span className="val">
                  {h.supportingPapers && h.supportingPapers.length > 0
                    ? h.supportingPapers.map(paperTitle).join('; ')
                    : <em style={{ color: 'var(--amber)' }}>no literature linked</em>}
                </span>
              </div>
              <div className="kv">
                <span className="k">Asserts</span>
                <span className="val wrap-gap">
                  {(h.asserts ?? []).map((e) => <code className="inl" key={e}>{e}</code>)}
                </span>
              </div>

              {flags.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="wrap-gap">
                    {flags.map((f) => (
                      <span key={f.id} className="flex" style={{ gap: 6 }}>
                        <SevDot severity={f.severity} label={INSTABILITY_LABEL[f.type]} />
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
