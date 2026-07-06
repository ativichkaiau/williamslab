import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { SEVERITY_COLOR } from '../lib/palette'

const NAV = [
  {
    group: 'OVERVIEW',
    items: [
      { to: '/', label: 'Overview', icon: '⌂', end: true },
      { to: '/pit-wall', label: 'Dashboard', icon: '▤' },
    ],
  },
  {
    group: 'DESIGN',
    items: [
      { to: '/hypotheses', label: 'Hypotheses', icon: '◆' },
      { to: '/mechanism', label: 'Mechanism Map', icon: '⇄' },
      { to: '/assays', label: 'Assays', icon: '▣' },
    ],
  },
  {
    group: 'EVIDENCE',
    items: [
      { to: '/radar', label: 'Literature', icon: '◎' },
      { to: '/power', label: 'Statistical Power', icon: '∑' },
      { to: '/suspension', label: 'Rigor Monitor', icon: '⚠' },
    ],
  },
  {
    group: 'KNOWLEDGE',
    items: [
      { to: '/graph', label: 'Knowledge Graph', icon: '⬡' },
      { to: '/review', label: 'Knowledge Review', icon: '✦' },
    ],
  },
]

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/pit-wall': 'Dashboard',
  '/hypotheses': 'Hypotheses',
  '/mechanism': 'Mechanism Map',
  '/assays': 'Assays',
  '/radar': 'Literature',
  '/power': 'Statistical Power',
  '/suspension': 'Rigor Monitor',
  '/graph': 'Knowledge Graph',
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
              <div className="h">{g.group}</div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
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

      <div className="main">
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
    </div>
  )
}
