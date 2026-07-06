import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Kicker, Rule } from '../components/ui'
import { THEORY } from '../data/brsTheory'

export default function Theory() {
  const [active, setActive] = useState(THEORY[0].id)

  // group the flat section list into ordered TOC groups
  const groups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, { id: string; title: string }[]>()
    THEORY.forEach((s) => {
      if (!map.has(s.group)) {
        map.set(s.group, [])
        order.push(s.group)
      }
      map.get(s.group)!.push({ id: s.id, title: s.title })
    })
    return order.map((g) => ({ group: g, items: map.get(g)! }))
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    THEORY.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Instant jump; the section's scroll-margin-top clears the sticky topbar.
  const go = (id: string) => document.getElementById(id)?.scrollIntoView()

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>BRUGADA SYNDROME · COMPLETE REFERENCE</Kicker>
            <h1 style={{ marginTop: 12 }}>BrS Theory</h1>
            <p>An exhaustive, curated reference on Brugada Syndrome — history, epidemiology, genetics, cellular electrophysiology, mechanisms, the full clinical picture, and the epigenetic frontier your project targets. Static and always available (no API key needed). For a live, interactive review, use the <Link to="/review">Knowledge Review</Link> or the ✦ copilot.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none' }}>
            <Link className="icon-btn" to="/review">Ask the Review →</Link>
            <Link className="icon-btn" to="/graph">Graph →</Link>
          </div>
        </div>
      </div>

      <div className="theory">
        <nav className="theory-toc">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="toc-group-h">{g.group}</div>
              {g.items.map((s) => (
                <button key={s.id} className={`toc-link${active === s.id ? ' active' : ''}`} onClick={() => { setActive(s.id); go(s.id) }}>
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="theory-body">
          {THEORY.map((s, i) => (
            <section key={s.id} id={s.id} className="theory-sec">
              <h2><span className="no">{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
              <div className="prose">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
