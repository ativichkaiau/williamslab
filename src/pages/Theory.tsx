import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Kicker, Rule } from '../components/ui'
import { THEORY } from '../data/brsTheory'
import { REFS, citationUrl } from '../data/brsRefs'
import { QUIZ } from '../data/brsQuiz'
import { useReadSections } from '../lib/theoryProgress'
import { searchPubmed, type PubmedHit } from '../lib/pubmed'

// --- per-section citations + live "latest on PubMed" ---
function SectionCitations({ id }: { id: string }) {
  const data = REFS[id]
  const [hits, setHits] = useState<PubmedHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  if (!data) return null
  const refresh = async () => {
    setLoading(true)
    setErr('')
    try {
      setHits(await searchPubmed(data.query, 6, 'date'))
    } catch {
      setErr('Could not reach PubMed — try again shortly.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="cite-box">
      <div className="cite-h">References &amp; sources</div>
      <ul className="cite-list">
        {data.refs.map((c, i) => (
          <li key={i}>
            <a href={citationUrl(c)} target="_blank" rel="noreferrer">
              {c.cite}
              {c.pmid ? ` · PMID ${c.pmid}` : ''} ↗
            </a>
          </li>
        ))}
      </ul>
      <div className="cite-refresh">
        <button className="btn ghost sm" onClick={refresh} disabled={loading}>
          {loading ? 'Searching PubMed…' : '⟳ Latest on PubMed'}
        </button>
        <span className="small mono muted">query: {data.query}</span>
        {err && <span className="small" style={{ color: 'var(--red)' }}>{err}</span>}
      </div>
      {hits && hits.length > 0 && (
        <ul className="cite-list latest">
          {hits.map((h) => (
            <li key={h.pmid}>
              <a href={`https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`} target="_blank" rel="noreferrer">
                {h.title} — <i>{h.journal}{h.year ? ` · ${h.year}` : ''}</i> ↗
              </a>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length === 0 && <p className="small empty">No recent results returned.</p>}
    </div>
  )
}

// --- self-check quiz ---
function QuizPanel({ onExit, onReview }: { onExit: () => void; onReview: (sectionId: string) => void }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = QUIZ[i]
  const pick = (idx: number) => {
    if (picked !== null) return
    setPicked(idx)
    if (idx === q.answer) setScore((s) => s + 1)
  }
  const next = () => {
    if (i + 1 >= QUIZ.length) return setDone(true)
    setI(i + 1)
    setPicked(null)
  }
  const retake = () => {
    setI(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  if (done) {
    const pct = score / QUIZ.length
    return (
      <div className="quiz-panel">
        <div className="quiz-done">
          <div className="quiz-score">{score} / {QUIZ.length}</div>
          <p>{pct === 1 ? 'Perfect — you own the sodium-current axis.' : pct >= 0.7 ? 'Strong. Revisit the ones you missed.' : 'Worth another pass through the theory.'}</p>
          <div className="wrap-gap" style={{ justifyContent: 'center' }}>
            <button className="btn primary sm" onClick={retake}>Retake</button>
            <button className="btn ghost sm" onClick={onExit}>Back to reading</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-panel">
      <div className="quiz-top">
        <span className="mono small">Question {i + 1} / {QUIZ.length}</span>
        <span className="mono small">Score {score}</span>
        <button className="btn ghost sm" onClick={onExit} style={{ marginLeft: 'auto' }}>Exit quiz</button>
      </div>
      <div className="quiz-track"><i style={{ width: `${(i / QUIZ.length) * 100}%` }} /></div>
      <h3 className="quiz-q">{q.q}</h3>
      <div className="quiz-opts">
        {q.options.map((o, idx) => {
          const cls = picked === null ? '' : idx === q.answer ? 'correct' : idx === picked ? 'wrong' : ''
          return (
            <button key={idx} className={`quiz-opt ${cls}`} onClick={() => pick(idx)} disabled={picked !== null}>
              {o}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className={`quiz-explain ${picked === q.answer ? 'ok' : 'no'}`}>
          <b>{picked === q.answer ? 'Correct. ' : 'Not quite. '}</b>
          {q.explain}
          <div className="wrap-gap" style={{ marginTop: 10 }}>
            <button className="btn ghost sm" onClick={() => onReview(q.sectionId)}>Review section →</button>
            <button className="btn primary sm" onClick={next}>{i + 1 >= QUIZ.length ? 'See score' : 'Next question'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Theory() {
  const [active, setActive] = useState(THEORY[0].id)
  const [q, setQ] = useState('')
  const [quiz, setQuiz] = useState(false)
  const [index, setIndex] = useState<Record<string, string>>({})
  const { read, toggle, clear } = useReadSections()

  const query = q.trim().toLowerCase()
  const matches = (s: (typeof THEORY)[number]) =>
    !query || (index[s.id] ?? `${s.title} ${s.group}`.toLowerCase()).includes(query)
  const visible = THEORY.filter(matches)

  // TOC groups, reflecting the current (possibly filtered) visible set
  const order: string[] = []
  const gmap = new Map<string, { id: string; title: string }[]>()
  visible.forEach((s) => {
    if (!gmap.has(s.group)) {
      gmap.set(s.group, [])
      order.push(s.group)
    }
    gmap.get(s.group)!.push({ id: s.id, title: s.title })
  })
  const groups = order.map((g) => ({ group: g, items: gmap.get(g)! }))

  const readCount = THEORY.filter((s) => read.has(s.id)).length
  const readPct = Math.round((readCount / THEORY.length) * 100)

  // build a full-text index over rendered bodies once, so search covers prose
  useEffect(() => {
    const idx: Record<string, string> = {}
    THEORY.forEach((s) => {
      const el = document.getElementById(s.id)
      idx[s.id] = `${s.title} ${s.group} ${el?.textContent ?? ''}`.toLowerCase()
    })
    setIndex(idx)
  }, [])

  // scroll-spy — re-observe whenever the rendered set changes
  useEffect(() => {
    if (quiz) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    visible.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, quiz])

  const go = (id: string) => document.getElementById(id)?.scrollIntoView()

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>BRUGADA SYNDROME · COMPLETE REFERENCE</Kicker>
            <h1 style={{ marginTop: 12 }}>BrS Theory</h1>
            <p>An exhaustive, curated reference on Brugada Syndrome — history, epidemiology, genetics, cellular electrophysiology, mechanisms, the full clinical picture, and the epigenetic frontier your project targets. Each section is grounded in PubMed sources you can refresh live. For a conversational review, use the <Link to="/review">Knowledge Review</Link> or the ✦ copilot.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none' }}>
            <Link className="icon-btn" to="/review">Ask the Review →</Link>
            <Link className="icon-btn" to="/graph">Graph →</Link>
          </div>
        </div>
      </div>

      {!quiz && (
        <div className="theory-controls">
          <input className="input" placeholder="Search the theory…" value={q} onChange={(e) => setQ(e.target.value)} />
          {query && <span className="small mono muted">{visible.length} section{visible.length === 1 ? '' : 's'}</span>}
          <div className="read-progress" title={`${readCount} of ${THEORY.length} sections marked read`}>
            <div className="rp-track"><i style={{ width: `${readPct}%` }} /></div>
            <span className="small mono">{readCount}/{THEORY.length} read</span>
          </div>
          <button className="btn primary sm" onClick={() => setQuiz(true)}>◎ Quiz mode</button>
          {readCount > 0 && <button className="btn ghost sm" onClick={clear}>Reset</button>}
        </div>
      )}

      {quiz ? (
        <QuizPanel
          onExit={() => setQuiz(false)}
          onReview={(id) => {
            setQuiz(false)
            setQ('')
            setTimeout(() => go(id), 60)
          }}
        />
      ) : (
        <div className="theory">
          <nav className="theory-toc">
            {groups.map((g) => (
              <div key={g.group}>
                <div className="toc-group-h">{g.group}</div>
                {g.items.map((s) => (
                  <button
                    key={s.id}
                    className={`toc-link${active === s.id ? ' active' : ''}${read.has(s.id) ? ' read' : ''}`}
                    onClick={() => { setActive(s.id); go(s.id) }}
                  >
                    {read.has(s.id) && <span className="toc-tick">✓</span>}
                    {s.title}
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && <p className="small empty">No matches.</p>}
          </nav>

          <div className="theory-body">
            {visible.map((s) => {
              const n = THEORY.findIndex((t) => t.id === s.id) + 1
              return (
                <section key={s.id} id={s.id} className="theory-sec">
                  <div className="sec-head">
                    <h2><span className="no">{String(n).padStart(2, '0')}</span>{s.title}</h2>
                    <button className={`read-toggle${read.has(s.id) ? ' on' : ''}`} onClick={() => toggle(s.id)}>
                      {read.has(s.id) ? '✓ Read' : 'Mark as read'}
                    </button>
                  </div>
                  <div className="prose">{s.body}</div>
                  <SectionCitations id={s.id} />
                </section>
              )
            })}
            {visible.length === 0 && <p className="empty">No sections match “{q}”.</p>}
          </div>
        </div>
      )}
    </>
  )
}
