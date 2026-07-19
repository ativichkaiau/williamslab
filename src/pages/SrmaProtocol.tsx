import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'

export default function SrmaProtocol() {
  const { state, updateReview } = useStore()
  const r = state.review

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>SYSTEMATIC REVIEW · PROTOCOL</Kicker>
        <h1 style={{ marginTop: 12 }}>Review protocol</h1>
        <p>{r.title}</p>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--navy)' }} />REVIEW QUESTION</div>
          <p className="hyp-quote">{r.question}</p>
        </div>

        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />PICO</div>
          <div className="grid g4">
            {[
              { k: 'Population', v: r.pico.p, c: 'var(--blue)' },
              { k: 'Intervention / exposure', v: r.pico.i, c: 'var(--violet)' },
              { k: 'Comparator', v: r.pico.c, c: 'var(--amber)' },
              { k: 'Outcome', v: r.pico.o, c: 'var(--green)' },
            ].map((x) => (
              <div key={x.k} className="pico-cell" style={{ borderTopColor: x.c }}>
                <div className="pico-k" style={{ color: x.c }}>{x.k}</div>
                <div className="pico-v">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid g2">
          <div className="card lg">
            <div className="card-h"><span className="sq" style={{ background: 'var(--green)' }} />INCLUSION CRITERIA</div>
            {r.inclusion.map((c) => <div className="list-item" key={c}><span className="ic" style={{ color: 'var(--green)' }}>✓</span><span>{c}</span></div>)}
          </div>
          <div className="card lg">
            <div className="card-h"><span className="sq" style={{ background: 'var(--red)' }} />EXCLUSION CRITERIA</div>
            {r.exclusion.map((c) => <div className="list-item" key={c}><span className="ic" style={{ color: 'var(--red)' }}>✕</span><span>{c}</span></div>)}
          </div>
        </div>

        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />SEARCH STRATEGY</div>
          <div className="wrap-gap" style={{ marginBottom: 12 }}>
            {r.databases.map((d) => <span className="pill" key={d}>{d}</span>)}
          </div>
          {r.searches.map((s) => (
            <div key={s.db} style={{ marginBottom: 10 }}>
              <div className="small mono" style={{ marginBottom: 4, color: 'var(--muted)' }}>{s.db}</div>
              <pre className="query">{s.query}</pre>
            </div>
          ))}
        </div>

        <div className="grid g2">
          <div className="card lg">
            <div className="card-h"><span className="sq" style={{ background: 'var(--amber)' }} />REGISTRATION &amp; METHODS</div>
            <div className="kv"><span className="k">Registration</span><input className="input" style={{ maxWidth: 260 }} value={r.registration ?? ''} onChange={(e) => updateReview({ registration: e.target.value })} placeholder="PROSPERO CRD…" /></div>
            <div className="kv"><span className="k">Effect measure</span><span className="val">{r.effect} · {r.indexLabel} vs {r.comparatorLabel}</span></div>
            <div className="kv"><span className="k">Synthesis</span><span className="val">Inverse-variance {r.model}-effects; heterogeneity by I² / τ²</span></div>
            <div className="kv"><span className="k">Risk of bias</span><span className="val">{r.robTool ? <><b>{r.robTool}</b> — </> : null}{r.robDomains.join(', ')}</span></div>
            <div className="kv"><span className="k">Reporting</span><span className="val">PRISMA 2020</span></div>
          </div>
          <div className="card lg" style={{ borderLeft: '4px solid var(--accent, var(--blue))' }}>
            <div className="card-h"><span className="sq" style={{ background: 'var(--accent, var(--blue))' }} />SCREENING</div>
            <p className="small" style={{ marginBottom: 12 }}>Title/abstract and full-text screening run in your dedicated screener. Its counts feed the <b>PRISMA flow</b> here.</p>
            <a className="btn primary" href={r.screenerUrl} target="_blank" rel="noreferrer">Open the SRMA screener ↗</a>
            <p className="small mono" style={{ marginTop: 10, wordBreak: 'break-all' }}>{r.screenerUrl}</p>
          </div>
        </div>
      </div>
    </>
  )
}
