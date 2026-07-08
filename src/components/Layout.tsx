import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useStore } from '../lib/store'
import { SEVERITY_COLOR } from '../lib/palette'
import AssistantDock from './AssistantDock'

// g-chord destinations (press "g" then the key)
const GNAV: Record<string, string> = { o: '/', d: '/pit-wall', r: '/review', t: '/theory', k: '/graph', m: '/meta', s: '/studies', h: '/hypotheses', p: '/prisma' }
const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘/Ctrl + Z', label: 'Undo last edit' },
  { keys: '⌘/Ctrl + ⇧ + Z', label: 'Redo' },
  { keys: '⌘/Ctrl + K', label: 'Toggle the AI copilot' },
  { keys: 'g then o / r / t / k / m / s', label: 'Go to Overview / Review / Theory / Graph / Meta / Studies' },
  { keys: '?', label: 'Show this shortcuts panel' },
  { keys: 'Esc', label: 'Close panels' },
]

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
      { to: '/manuscript', label: 'Manuscript', icon: '¶', color: '#ea580c' },
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
  '/manuscript': 'Manuscript',
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
  const store = useStore()
  const { state, stability, instabilities, projects, activeId, switchProject, createProject, undo, redo, canUndo, canRedo } = store
  const [projMenu, setProjMenu] = useState(false)
  const [help, setHelp] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const [theme, setTheme] = useState<'day' | 'night'>(
    () => (document.documentElement.getAttribute('data-theme') as 'day' | 'night') || 'day',
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // keyboard shortcuts (undo/redo, help, g-chord navigation)
  const storeRef = useRef(store)
  storeRef.current = store
  const gPending = useRef(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (typing) return // leave native text undo alone
        e.preventDefault()
        if (e.shiftKey) storeRef.current.redo()
        else storeRef.current.undo()
        return
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        if (typing) return
        e.preventDefault()
        storeRef.current.redo()
        return
      }
      if (typing || mod) return
      if (e.key === '?') {
        setHelp((h) => !h)
        return
      }
      if (e.key === 'Escape') {
        setHelp(false)
        setProjMenu(false)
        return
      }
      if (e.key === 'g') {
        gPending.current = true
        window.setTimeout(() => (gPending.current = false), 900)
        return
      }
      if (gPending.current) {
        gPending.current = false
        const to = GNAV[e.key.toLowerCase()]
        if (to) {
          e.preventDefault()
          nav(to)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

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
            <span className="undo-group">
              <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↶</button>
              <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">↷</button>
            </span>
            <button className="icon-btn" onClick={() => setHelp(true)} title="Keyboard shortcuts (?)">⌘</button>
            <div className="proj-switch">
              <button className="proj-chip" onClick={() => setProjMenu((v) => !v)} title={state.project.name}>{state.project.code} ▾</button>
              {projMenu && (
                <>
                  <div className="proj-backdrop" onClick={() => setProjMenu(false)} />
                  <div className="proj-menu">
                    <div className="proj-menu-h">PROJECTS</div>
                    {projects.map((p) => (
                      <button key={p.id} className={`proj-item${p.id === activeId ? ' active' : ''}`} onClick={() => { switchProject(p.id); setProjMenu(false) }}>
                        <b>{p.code}</b><span>{p.name}</span>
                      </button>
                    ))}
                    <div className="proj-sep" />
                    <button className="proj-item new" onClick={() => { const n = window.prompt('New review / project name'); if (n) createProject(n); setProjMenu(false) }}>＋ New review / project</button>
                  </div>
                </>
              )}
            </div>
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

      {help && (
        <div className="kbd-overlay" onClick={() => setHelp(false)}>
          <div className="kbd-card" onClick={(e) => e.stopPropagation()}>
            <div className="kbd-head">
              <b>Keyboard shortcuts</b>
              <button className="ai-x" onClick={() => setHelp(false)} aria-label="Close">✕</button>
            </div>
            <div className="kbd-list">
              {SHORTCUTS.map((s) => (
                <div className="kbd-row" key={s.label}>
                  <kbd>{s.keys}</kbd>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
