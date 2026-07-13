import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Kicker, Rule, StatCard } from '../components/ui'
import { computeInstabilities, stabilityScore } from '../lib/suspension'
import { computeMeta, measureInfo, fmt } from '../lib/metaAnalysis'
import { planPhases } from '../lib/assayPlan'
import { STAGES } from '../types'
import type { ProjectState } from '../types'

function rigorColor(v: number) {
  return v >= 0.75 ? 'var(--green)' : v >= 0.5 ? 'var(--amber)' : 'var(--red)'
}

function metrics(p: ProjectState) {
  const inst = computeInstabilities(p)
  const rigor = stabilityScore(inst)
  const openFlags = inst.filter((i) => i.status === 'open').length
  const included = p.review.studies.filter((s) => s.include)
  const meta = included.length >= 2 ? computeMeta(p.review.studies, p.review.model, p.review.effect) : null
  const plan = planPhases(p.assays)
  const stageIdx = Math.max(0, STAGES.indexOf((p.project.stage ?? 'Idea') as (typeof STAGES)[number]))
  return { rigor, openFlags, includedN: included.length, meta, plan, stageIdx }
}

export default function Portfolio() {
  const { allProjects, activeId, switchProject } = useStore()
  const nav = useNavigate()
  const rows = useMemo(() => allProjects.map((p) => ({ p, m: metrics(p) })), [allProjects])

  const totals = useMemo(() => ({
    studies: rows.reduce((a, x) => a + x.m.includedN, 0),
    hyps: rows.reduce((a, x) => a + x.p.hypotheses.length, 0),
    assays: rows.reduce((a, x) => a + x.p.assays.length, 0),
    cost: rows.reduce((a, x) => a + x.m.plan.totalCost, 0),
    avgRigor: rows.length ? rows.reduce((a, x) => a + x.m.rigor, 0) / rows.length : 0,
  }), [rows])

  const open = (id: string) => { switchProject(id); nav('/') }

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>PORTFOLIO · ALL PROJECTS</Kicker>
        <h1>Portfolio</h1>
        <p>Every review and lab project at a glance — rigor, pooled effect, pipeline and budget side by side. Click a project to switch to it.</p>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard value={rows.length} label="Projects" sub={`avg rigor ${Math.round(totals.avgRigor * 100)}%`} tone="#1746d1" />
        <StatCard value={totals.studies} label="Included studies" sub="across all reviews" tone="#6366f1" />
        <StatCard value={totals.hyps} label="Hypotheses" sub={`${totals.assays} assays`} tone="#7c3aed" />
        <StatCard value={`$${totals.cost.toLocaleString()}k`} label="Total planned budget" sub="all assays" tone="#12b981" />
      </div>

      <div className="tbl-scroll">
        <table>
          <thead>
            <tr><th>Project</th><th>Stage</th><th>Rigor</th><th>Meta-analysis</th><th>Hyp</th><th>Assays</th><th>Budget</th><th>Flags</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(({ p, m }) => (
              <tr key={p.project.id} style={p.project.id === activeId ? { background: 'color-mix(in srgb, var(--blue) 6%, transparent)' } : undefined}>
                <td>
                  <b>{p.project.code}</b>{p.project.id === activeId && <span className="chip" style={{ marginLeft: 8 }}>active</span>}
                  <div className="small" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.project.name}</div>
                </td>
                <td>
                  <span className="mono small">{STAGES[m.stageIdx]}</span>
                  <span className="pf-bar"><i style={{ width: `${(m.stageIdx / (STAGES.length - 1)) * 100}%` }} /></span>
                </td>
                <td>
                  <div className="flex" style={{ gap: 8 }}>
                    <span className="pf-bar" style={{ width: 60 }}><i style={{ width: `${Math.round(m.rigor * 100)}%`, background: rigorColor(m.rigor) }} /></span>
                    <span className="mono" style={{ color: rigorColor(m.rigor), fontWeight: 700 }}>{Math.round(m.rigor * 100)}%</span>
                  </div>
                </td>
                <td className="mono">
                  {m.meta ? <>{measureInfo(p.review.effect).id} <b>{fmt(m.meta.pooledEst)}</b> [{fmt(m.meta.pooledLow)}, {fmt(m.meta.pooledHigh)}]<div className="small muted">{m.includedN} studies · I²={fmt(m.meta.I2, 0)}%</div></> : <span className="muted">{m.includedN} stud{m.includedN === 1 ? 'y' : 'ies'} · no pool</span>}
                </td>
                <td className="mono">{p.hypotheses.length}</td>
                <td className="mono">{p.assays.length}</td>
                <td className="mono">{m.plan.totalCost ? `$${m.plan.totalCost}k` : '—'}<div className="small muted">{m.plan.totalWeeks} wk</div></td>
                <td>{m.openFlags === 0 ? <span className="small" style={{ color: 'var(--green)' }}>clear</span> : <span className="badge b-block">{m.openFlags} open</span>}</td>
                <td><button className="icon-btn" onClick={() => open(p.project.id)}>Open →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10 }}>Rigor and pooled estimates are recomputed live from each project's data. Create or import projects from the switcher in the top bar.</p>
    </>
  )
}
