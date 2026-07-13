import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'
import { searchPubmed, type PubmedHit } from '../lib/pubmed'
import { complete, parseJsonLoose, hasKey, getModel } from '../lib/openai'
import { listSearches, saveSearch, recordRun, removeSearch, findSearch, type SavedSearch } from '../lib/savedSearches'
import { taStatus, advanced } from '../lib/screening'
import type { ScreenRecord } from '../types'

const srUid = () => (crypto.randomUUID ? crypto.randomUUID() : `sr_${Date.now()}_${Math.random().toString(36).slice(2)}`)

const STANCE_CLASS: Record<string, string> = {
  supports: 'b-supported',
  refutes: 'b-refuted',
  background: 'b-draft',
}

type Verdict = 'include' | 'maybe' | 'exclude'
const VERDICT_CLASS: Record<Verdict, string> = { include: 'v-include', maybe: 'v-maybe', exclude: 'v-exclude' }

function firstAuthorSurname(authors?: string): string {
  if (!authors) return 'Unknown'
  const first = authors.split(/[,;]/)[0].trim()
  return first.split(/\s+/)[0] || 'Unknown'
}

export default function Radar() {
  const { state, addPaper, removePaper, addStudy, updateReview } = useStore()
  const hypLabel = (id: string) => state.hypotheses.find((h) => h.id === id)?.label.split('·')[0].trim() ?? id
  const gaps = state.hypotheses.filter((h) => !h.supportingPapers || h.supportingPapers.length === 0)

  const [query, setQuery] = useState('Brugada syndrome SCN5A methylation')
  const [hits, setHits] = useState<PubmedHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<SavedSearch[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [triage, setTriage] = useState<Record<string, { verdict: Verdict; reason: string }>>({})
  const [triaging, setTriaging] = useState(false)
  const [living, setLiving] = useState<{ running: boolean; ran: boolean; newHits: (PubmedHit & { search: string })[] }>({ running: false, ran: false, newHits: [] })

  useEffect(() => setSaved(listSearches()), [])

  // ---- living review: re-run every saved search, surface what's new ----
  const screening = state.review.screening ?? []
  const pendingToScreen = screening.filter((s) => taStatus(s) === 'pending').length
  const includedN = advanced(screening).filter((s) => s.ft === 'include').length

  async function runLiving() {
    const searches = listSearches()
    if (!searches.length) return
    setLiving({ running: true, ran: false, newHits: [] })
    const all: (PubmedHit & { search: string })[] = []
    for (const s of searches) {
      try {
        const res = await searchPubmed(s.query, 25, 'date')
        const freshSet = recordRun(s.query, res.map((h) => h.pmid), Date.now())
        res.filter((h) => freshSet.has(h.pmid)).forEach((h) => all.push({ ...h, search: s.query }))
      } catch {
        /* skip a failed search, keep going */
      }
    }
    setLiving({ running: false, ran: true, newHits: all })
    setSaved(listSearches())
  }

  function addNewToScreening() {
    const existing = new Set(screening.map((s) => s.pmid))
    const fresh: ScreenRecord[] = living.newHits
      .filter((h) => !existing.has(h.pmid))
      .map((h) => ({ id: srUid(), pmid: h.pmid, title: h.title, journal: h.journal, year: h.year, authors: h.authors }))
    if (fresh.length) updateReview({ screening: [...screening, ...fresh] })
    setLiving({ ...living, newHits: [] })
  }

  const paperId = (pmid: string) => `paper_pmid_${pmid}`
  const isAdded = (pmid: string) => state.papers.some((p) => p.id === paperId(pmid))
  const inStudies = (pmid: string) => state.review.studies.some((s) => s.pmid === pmid)
  const isSaved = !!findSearch(query)

  async function run(q = query) {
    setQuery(q)
    setLoading(true)
    setError(null)
    setTriage({})
    try {
      const res = await searchPubmed(q, 20)
      setHits(res)
      setFresh(recordRun(q, res.map((h) => h.pmid), Date.now()))
      setSaved(listSearches())
      if (res.length === 0) setError('No results for that query.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PubMed request failed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function saveCurrent() {
    saveSearch(query, hits.map((h) => h.pmid), Date.now())
    setSaved(listSearches())
    setFresh(new Set())
  }
  function drop(id: string) {
    removeSearch(id)
    setSaved(listSearches())
  }

  function add(h: PubmedHit) {
    addPaper(
      { id: paperId(h.pmid), pmid: h.pmid, doi: h.doi, title: h.title, year: h.year, stance: 'background', tags: h.journal ? [h.journal] : [] },
      links[h.pmid] || undefined,
    )
  }
  function toStudies(h: PubmedHit) {
    if (inStudies(h.pmid)) return
    addStudy({ author: firstAuthorSurname(h.authors), year: h.year ?? new Date().getFullYear(), pmid: h.pmid, include: false, note: `${h.title}${h.journal ? ' — ' + h.journal : ''}` })
  }

  async function runTriage() {
    if (!hasKey()) {
      setError('Add an OpenAI key in Knowledge Review → Settings to use AI triage.')
      return
    }
    if (!hits.length) return
    setTriaging(true)
    setError(null)
    try {
      const list = hits.map((h) => `PMID ${h.pmid}: ${h.title} — ${h.journal ?? ''} ${h.year ?? ''}`).join('\n')
      const text = await complete(
        [
          { role: 'system', content: 'You are a systematic-review screening assistant. Output ONLY valid JSON, no prose.' },
          {
            role: 'user',
            content: `Systematic review question: "${state.review.question}"\nPICO — population: ${state.review.pico.p}; intervention/exposure: ${state.review.pico.i}; comparator: ${state.review.pico.c}; outcome: ${state.review.pico.o}\n\nFor EACH paper below, judge screening relevance as "include", "maybe" or "exclude" and give a reason of at most 12 words. Return a JSON array: [{"pmid":"12345","verdict":"include|maybe|exclude","reason":"…"}].\n\n${list}`,
          },
        ],
        getModel(),
      )
      const arr = parseJsonLoose<{ pmid: string; verdict: Verdict; reason: string }[]>(text)
      const map: Record<string, { verdict: Verdict; reason: string }> = {}
      for (const r of arr) if (r?.pmid) map[String(r.pmid)] = { verdict: r.verdict, reason: r.reason }
      setTriage(map)
    } catch {
      setError('AI triage failed — the model may have returned an unexpected format. Try again.')
    } finally {
      setTriaging(false)
    }
  }

  const triagedIncludes = hits.filter((h) => triage[h.pmid]?.verdict === 'include' && !inStudies(h.pmid))
  function sendAllIncludes() {
    triagedIncludes.forEach(toStudies)
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>LITERATURE · LIVE PUBMED</Kicker>
        <h1>Literature Radar</h1>
        <p>Search PubMed live, triage hits for the review with AI, link them to a hypothesis, and send them straight into the SRMA extraction table. Saved searches flag what's new since you last looked.</p>
      </div>

      <div className="card lg" style={{ marginBottom: 16, borderLeft: '4px solid var(--green)' }}>
        <div className="card-h" style={{ justifyContent: 'space-between' }}>
          <span><span className="sq" style={{ background: 'var(--green)' }} />LIVING REVIEW</span>
          <button className="btn primary sm" onClick={runLiving} disabled={living.running || saved.length === 0}>{living.running ? 'Re-running…' : `⟳ Re-run ${saved.length} saved search${saved.length === 1 ? '' : 'es'}`}</button>
        </div>
        {saved.length === 0 ? (
          <p className="small">Save a search below (☆) to track it. The living review re-runs all saved searches and flags anything published since you last looked.</p>
        ) : (
          <>
            <div className="lr-stats">
              <span className="lr-stat"><b>{saved.length}</b> saved search{saved.length === 1 ? '' : 'es'}</span>
              <span className="lr-stat"><b>{pendingToScreen}</b> to screen</span>
              <span className="lr-stat"><b>{includedN}</b> included</span>
              <span className="lr-stat"><b>{state.review.studies.length}</b> in extraction</span>
              <span className="spacer" />
              <Link className="small" to="/screening">Open screening →</Link>
            </div>
            {living.ran && (
              living.newHits.length === 0 ? (
                <p className="small" style={{ color: 'var(--green)', marginTop: 10 }}>✓ Up to date — no new results across your saved searches.</p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div className="flex" style={{ marginBottom: 8 }}>
                    <b>{living.newHits.length} new result{living.newHits.length === 1 ? '' : 's'} since last run</b>
                    <span className="spacer" />
                    <button className="btn ghost sm" onClick={addNewToScreening}>→ Add all to Screening</button>
                  </div>
                  {living.newHits.slice(0, 12).map((h) => (
                    <div key={h.pmid} className="stint" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nm"><span className="new-dot">NEW</span>{h.title}</div>
                        <div className="meta">{h.journal ?? '—'} {h.year ?? ''} · <a href={`https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`} target="_blank" rel="noreferrer">PMID {h.pmid} ↗</a> · from “{h.search.length > 40 ? h.search.slice(0, 38) + '…' : h.search}”</div>
                      </div>
                    </div>
                  ))}
                  {living.newHits.length > 12 && <p className="small" style={{ marginTop: 6 }}>+{living.newHits.length - 12} more.</p>}
                </div>
              )
            )}
          </>
        )}
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
          <button className="btn primary" onClick={() => run()} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </div>

        {(saved.length > 0 || hits.length > 0) && (
          <div className="saved-row">
            {hits.length > 0 && !isSaved && <button className="chip-btn" onClick={saveCurrent} title="Save this query to track new results">☆ Save search</button>}
            {saved.map((s) => (
              <span key={s.id} className={`saved-chip${findSearch(query) && s.query === query ? ' active' : ''}`}>
                <button className="sc-run" onClick={() => run(s.query)} title={`Last run ${new Date(s.lastRun).toLocaleDateString()}`}>★ {s.query.length > 34 ? s.query.slice(0, 32) + '…' : s.query}</button>
                <button className="sc-x" onClick={() => drop(s.id)} title="Remove saved search">✕</button>
              </span>
            ))}
          </div>
        )}

        {error && <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}

        {hits.length > 0 && (
          <>
            <div className="flex" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn ghost sm" onClick={runTriage} disabled={triaging}>{triaging ? 'Triaging…' : '✦ AI relevance triage'}</button>
              {triagedIncludes.length > 0 && <button className="btn primary sm" onClick={sendAllIncludes}>→ Send {triagedIncludes.length} "include" to Studies</button>}
              {fresh.size > 0 && <span className="pill" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>{fresh.size} new since last run</span>}
              <span className="small mono muted" style={{ marginLeft: 'auto' }}>{hits.length} hits</span>
            </div>

            <div style={{ marginTop: 12 }}>
              {hits.map((h) => {
                const tv = triage[h.pmid]
                return (
                  <div key={h.pmid} className="stint" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">
                        {fresh.has(h.pmid) && <span className="new-dot" title="New since last run">NEW</span>}
                        {tv && <span className={`vbadge ${VERDICT_CLASS[tv.verdict]}`} title={tv.reason}>{tv.verdict}</span>}
                        {h.title}
                      </div>
                      <div className="meta">
                        {h.authors || 'Unknown authors'} · {h.journal ?? '—'} {h.year ?? ''} · <a href={`https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`} target="_blank" rel="noreferrer">PMID {h.pmid} ↗</a>
                        {tv ? ` · ${tv.reason}` : ''}
                      </div>
                    </div>
                    <div className="flex" style={{ gap: 8, flex: 'none', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <select className="select" style={{ width: 138 }} value={links[h.pmid] ?? ''} onChange={(e) => setLinks((l) => ({ ...l, [h.pmid]: e.target.value }))}>
                        <option value="">link to…</option>
                        {state.hypotheses.map((hy) => (
                          <option key={hy.id} value={hy.id}>{hypLabel(hy.id)}</option>
                        ))}
                      </select>
                      <button className="btn ghost sm" onClick={() => add(h)} disabled={isAdded(h.pmid)}>{isAdded(h.pmid) ? 'On graph ✓' : '+ Graph'}</button>
                      <button className="btn ghost sm" onClick={() => toStudies(h)} disabled={inStudies(h.pmid)} title="Add to the SRMA extraction table">{inStudies(h.pmid) ? 'In Studies ✓' : '→ Studies'}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
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
          <p className="small">Hits marked <b>→ Studies</b> land in the <Link to="/studies">extraction table</Link> for 2×2 coding. Live via NCBI E-utilities (CORS, ~3 req/s).</p>
        </div>
      </div>
    </>
  )
}
