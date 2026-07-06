import { useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'
import { searchPubmed, type PubmedHit } from '../lib/pubmed'

const STANCE_CLASS: Record<string, string> = {
  supports: 'b-supported',
  refutes: 'b-refuted',
  background: 'b-draft',
}

export default function Radar() {
  const { state, addPaper, removePaper } = useStore()
  const hypLabel = (id: string) => state.hypotheses.find((h) => h.id === id)?.label.split('·')[0].trim() ?? id
  const gaps = state.hypotheses.filter((h) => !h.supportingPapers || h.supportingPapers.length === 0)

  const [query, setQuery] = useState('Brugada syndrome SCN5A methylation')
  const [hits, setHits] = useState<PubmedHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})

  const paperId = (pmid: string) => `paper_pmid_${pmid}`
  const isAdded = (pmid: string) => state.papers.some((p) => p.id === paperId(pmid))

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await searchPubmed(query, 15)
      setHits(res)
      if (res.length === 0) setError('No results for that query.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PubMed request failed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function add(h: PubmedHit) {
    const hypId = links[h.pmid] || undefined
    addPaper(
      { id: paperId(h.pmid), pmid: h.pmid, doi: h.doi, title: h.title, year: h.year, stance: 'background', tags: h.journal ? [h.journal] : [] },
      hypId,
    )
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>LITERATURE · LIVE PUBMED</Kicker>
        <h1>Literature Radar</h1>
        <p>Search PubMed live, link a hit to the hypothesis it bears on, and add it to the graph. Linking a paper to a hypothesis clears that hypothesis's literature-gap flag on the spot.</p>
      </div>

      <div className="card lg" style={{ marginBottom: 16 }}>
        <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />SEARCH PUBMED (E-UTILITIES)</div>
        <div className="flex" style={{ gap: 10 }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="e.g. SCN10A enhancer cardiac conduction"
          />
          <button className="btn primary" onClick={run} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </div>
        {error && <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}

        {hits.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {hits.map((h) => (
              <div key={h.pmid} className="stint" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">{h.title}</div>
                  <div className="meta">
                    {h.authors || 'Unknown authors'} · {h.journal ?? '—'} {h.year ?? ''} · PMID {h.pmid}
                    {h.doi ? ` · ${h.doi}` : ''}
                  </div>
                </div>
                <div className="flex" style={{ gap: 8, flex: 'none' }}>
                  <select className="select" style={{ width: 150 }} value={links[h.pmid] ?? ''} onChange={(e) => setLinks((l) => ({ ...l, [h.pmid]: e.target.value }))}>
                    <option value="">link to…</option>
                    {state.hypotheses.map((hy) => (
                      <option key={hy.id} value={hy.id}>{hypLabel(hy.id)}</option>
                    ))}
                  </select>
                  <button className="btn ghost sm" onClick={() => add(h)} disabled={isAdded(h.pmid)}>{isAdded(h.pmid) ? 'Added ✓' : 'Add'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.papers.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.title}</b><div className="small mono">{p.pmid ? `PMID ${p.pmid}` : 'PMID —'}{p.doi ? ` · ${p.doi}` : ''}</div></td>
                  <td className="mono">{p.year ?? '—'}</td>
                  <td><span className={`badge ${STANCE_CLASS[p.stance ?? 'background']}`}>{p.stance ?? 'background'}</span></td>
                  <td className="wrap-gap">{(p.targets ?? []).map((t) => <span className="chip" key={t}>{hypLabel(t)}</span>)}</td>
                  <td><button className="icon-btn danger" onClick={() => removePaper(p.id)}>Remove</button></td>
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
              <p className="small" style={{ marginBottom: 10 }}>Hypotheses with no supporting reference — search above and link one:</p>
              {gaps.map((h) => (
                <div className="list-item" key={h.id}>
                  <span className="ic" style={{ color: 'var(--amber)' }}>▲</span>
                  <span>{h.label}</span>
                </div>
              ))}
            </>
          )}
          <div className="divider" />
          <p className="small">Live via NCBI E-utilities (CORS-enabled, ~3 req/s). Identifiers come straight from PubMed.</p>
        </div>
      </div>
    </>
  )
}
