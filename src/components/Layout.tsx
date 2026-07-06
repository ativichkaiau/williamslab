import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState, type CSSProperties } from 'react'
import { useStore } from '../lib/store'
import { SEVERITY_COLOR } from '../lib/palette'
import AssistantDock from './AssistantDock'

const NAV = [
  {
    group: 'OVERVIEW',
    accent: '#1746d1',
    items: [
      { to: '/', label: 'Overview', icon: '⌂', color: '#1746d1', end: true },
      { to: '/pit-wall', label: 'Dashboard', icon: '▤', color: '#0891b2' },
    ],
  },
  {
    group: 'SYSTEMATIC REVIEW',
    accent: '#0d9488',
    items: [
      { to: '/protocol', label: 'Protocol', icon: '⊞', color: '#0d9488' },
      { to: '/prisma', label: 'PRISMA Flow', icon: '⇉', color: '#0891b2' },
      { to: '/studies', label: 'Studies', icon: '☰', color: '#6366f1' },
      { to: '/meta', label: 'Meta-analysis', icon: '⬦', color: '#db2777' },
    ],
  },
  {
    group: 'DESIGN',
    accent: '#7c3aed',
    items: [
      { to: '/hypotheses', label: 'Hypotheses', icon: '◆', color: '#7c3aed' },
      { to: '/mechanism', label: 'Mechanism Map', icon: '⇄', color: '#2f6bff' },
      { to: '/assays', label: 'Assays', icon: '▣', color: '#12b981' },
    ],
  },
  {
    group: 'EVIDENCE',
    accent: '#f59e0b',
    items: [
      { to: '/radar', label: 'Literature', icon: '◎', color: '#f59e0b' },
      { to: '/power', label: 'Statistical Power', icon: '∑', color: '#0891b2' },
      { to: '/suspension', label: 'Rigor Monitor', icon: '⚠', color: '#e2001a' },
    ],
  },
  {
    group: 'KNOWLEDGE',
    accent: '#db2777',
    items: [
      { to: '/graph', label: 'Knowledge Graph', icon: '⬡', color: '#4f46e5' },
      { to: '/theory', label: 'BrS Theory', icon: '§', color: '#db2777' },
      { to: '/review', label: 'Knowledge Review', icon: '✦', color: '#1746d1' },
    ],
  },
]

// each route's signature accent (drives the page-head glow, kicker, stats, topbar)
const ACCENT: Record<string, string> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.to, i.color])))

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/pit-wall': 'Dashboard',
  '/protocol': 'Review Protocol',
  '/prisma': 'PRISMA Flow',
  '/studies': 'Included Studies',
  '/meta': 'Meta-analysis',
  '/hypotheses': 'Hypotheses',
  '/mechanism': 'Mechanism Map',
  '/assays': 'Assays',
  '/radar': 'Literature',
  '/power': 'Statistical Power',
  '/suspension': 'Rigor Monitor',
  '/graph': 'Knowledge Graph',
  '/theory': 'BrS Theory',
  '/review': 'Knowledge Review',
}

function gaugeColor(v: number) {
  if (v >= 0.75) return SEVERITY_COLOR.low
  if (v >= 0.5) return SEVERITY_COLOR.med
  return SEVERITY_COLOR.high
}

export default function Layout() {
  const { state, stability, instabilities } = useStore()
  const loc = useLocation()
  const [theme, setTheme] = useState<'day' | 'night'>(
    () => (document.documentElement.getAttribute('data-theme') as 'day' | 'night') || 'day',
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const openFlags = instabilities.filter((i) => i.status === 'open').length
  const title = TITLES[loc.pathname] ?? 'WilliamsLab'
  const accent = ACCENT[loc.pathname] ?? '#1746d1'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="wtile">W</div>
          <div className="nm">
            Williams<b>Lab</b>
            <small>RESEARCH OS</small>
          </div>
        </div>
        <nav className="sb-nav">
          {NAV.map((g) => (
            <div className="sb-sec" key={g.group}>
              <div className="h" style={{ color: g.accent }}>{g.group}</div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  style={{ ['--ic' as string]: it.color } as CSSProperties}
                  className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
                >
                  <span className="ic">{it.icon}</span>
                  {it.label}
                  {it.to === '/suspension' && openFlags > 0 && (
                    <span className="fl" style={{ background: SEVERITY_COLOR.high }} title={`${openFlags} open`} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-foot">
          WilliamsLab · v0.1
          <br />
          Project {state.project.code}
        </div>
      </aside>

      <div className="main" style={{ ['--accent' as string]: accent } as CSSProperties}>
        <div className="topbar">
          <div>
            <div className="title">{title}</div>
            <div className="crumb">WILLIAMSLAB / {state.project.code}</div>
          </div>
          <div className="right">
            <span className="proj-chip">{state.project.code} · Y1</span>
            <span className="gauge" title="Project rigor">
              <span className="track">
                <i style={{ width: `${Math.round(stability * 100)}%`, background: gaugeColor(stability) }} />
              </span>
              {Math.round(stability * 100)}%
            </span>
            <span className="toggle" onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}>
              {theme === 'day' ? '☀︎ Day' : '☾ Night'}
            </span>
          </div>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
      <AssistantDock />
    </div>
  )
}
