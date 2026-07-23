import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useStore } from '../lib/store'
import { SEVERITY_COLOR } from '../lib/palette'
import AssistantDock from './AssistantDock'
import CommandPalette from './CommandPalette'

// g-chord destinations (press "g" then the key)
const GNAV: Record<string, string> = { o: '/', d: '/pit-wall', r: '/review', t: '/theory', k: '/graph', m: '/meta', s: '/studies', h: '/hypotheses', p: '/prisma' }
const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘/Ctrl + Z', label: 'Undo last edit' },
  { keys: '⌘/Ctrl + ⇧ + Z', label: 'Redo' },
  { keys: '⌘/Ctrl + K', label: 'Open the command palette' },
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
      { to: '/portfolio', label: 'Portfolio', icon: '▦', color: '#7c3aed' },
      { to: '/pit-wall', label: 'Dashboard', icon: '▤', color: '#0891b2' },
      { to: '/litlink', label: 'LitLink', icon: '⛓', color: '#0891b2' },
    ],
  },
  {
    group: 'SYSTEMATIC REVIEW',
    accent: '#0d9488',
    items: [
      { to: '/radar', label: 'Literature', icon: '◎', color: '#f59e0b' },
      { to: '/protocol', label: 'Protocol', icon: '⊞', color: '#0d9488' },
      { to: '/screening', label: 'Screening', icon: '☑', color: '#0891b2' },
      { to: '/prisma', label: 'PRISMA Flow', icon: '⇉', color: '#0891b2' },
      { to: '/studies', label: 'Studies', icon: '☰', color: '#6366f1' },
      { to: '/meta', label: 'Meta-analysis', icon: '⬦', color: '#db2777' },
      { to: '/diagnostic', label: 'Diagnostic MA', icon: '⊹', color: '#0d9488' },
      { to: '/references', label: 'References', icon: '❋', color: '#1746d1' },
      { to: '/manuscript', label: 'Manuscript', icon: '¶', color: '#ea580c' },
      { to: '/poster', label: 'Poster & Slides', icon: '◳', color: '#e2001a' },
      { to: '/reviewers', label: 'Rebuttal Letter', icon: '✎', color: '#0891b2' },
    ],
  },
  {
    group: 'EXPERIMENTS',
    accent: '#7c3aed',
    items: [
      { to: '/hypotheses', label: 'Hypotheses', icon: '◆', color: '#7c3aed' },
      { to: '/mechanism', label: 'Mechanism Map', icon: '⇄', color: '#2f6bff' },
      { to: '/assays', label: 'Assays', icon: '▣', color: '#12b981' },
      { to: '/power', label: 'Statistical Power', icon: '∑', color: '#0891b2' },
      { to: '/aims', label: 'Specific Aims', icon: '◈', color: '#7c3aed' },
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
  '/portfolio': 'Portfolio',
  '/pit-wall': 'Dashboard',
  '/litlink': 'LitLink',
  '/protocol': 'Review Protocol',
  '/screening': 'Screening',
  '/prisma': 'PRISMA Flow',
  '/studies': 'Included Studies',
  '/meta': 'Meta-analysis',
  '/diagnostic': 'Diagnostic Meta-analysis',
  '/references': 'Reference Library',
  '/manuscript': 'Manuscript',
  '/poster': 'Poster & Slides',
  '/reviewers': 'Response to Reviewers',
  '/hypotheses': 'Hypotheses',
  '/mechanism': 'Mechanism Map',
  '/assays': 'Assays',
  '/radar': 'Literature',
  '/power': 'Statistical Power',
  '/aims': 'Specific Aims',
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
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem('williamslab.nav.collapsed') || '[]'))
    } catch {
      return new Set<string>()
    }
  })
  const toggleGroup = (g: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      try {
        localStorage.setItem('williamslab.nav.collapsed', JSON.stringify([...next]))
      } catch {
        /* ignore */
      }
      return next
    })
  const loc = useLocation()
  const nav = useNavigate()
  // close the mobile drawer whenever the route changes
  useEffect(() => setNavOpen(false), [loc.pathname])
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
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((v) => !v)
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
        setNavOpen(false)
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
      {navOpen && <div className="sb-drawer-backdrop" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar${navOpen ? ' open' : ''}`}>
        <div className="sb-brand">
          <img className="wtile" src="/williams.png" alt="WilliamsLab" width={38} height={38} />
          <div className="nm">
            Williams<b>Lab</b>
            <small>RESEARCH OS</small>
          </div>
          <button className="sb-close" onClick={() => setNavOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <nav className="sb-nav">
          {NAV.map((g) => {
            const isCollapsed = collapsed.has(g.group)
            return (
              <div className={`sb-sec${isCollapsed ? ' collapsed' : ''}`} key={g.group} style={{ ['--grp' as string]: g.accent } as CSSProperties}>
                <button className="h" onClick={() => toggleGroup(g.group)} title={isCollapsed ? `Show ${g.group}` : `Hide ${g.group}`}>
                  <span className="chev">▾</span>
                  {g.group}
                </button>
                {!isCollapsed && g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={() => setNavOpen(false)}
                    style={{ ['--ic' as string]: g.accent } as CSSProperties}
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
            )
          })}
        </nav>
        <div className="sb-foot">
          WilliamsLab · v0.1
          <br />
          Project {state.project.code}
        </div>
      </aside>

      <div className="main" style={{ ['--accent' as string]: accent } as CSSProperties}>
        <div className="topbar">
          <button className="hamburger" onClick={() => setNavOpen(true)} aria-label="Open menu">☰</button>
          <div className="tb-title">
            <div className="title">{title}</div>
            <div className="crumb">WILLIAMSLAB / {state.project.code}</div>
          </div>
          <div className="right">
            <span className="undo-group">
              <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↶</button>
              <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">↷</button>
            </span>
            <button className="icon-btn kbd-btn" onClick={() => setHelp(true)} title="Keyboard shortcuts (?)">⌘</button>
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
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onToggleTheme={() => setTheme(theme === 'day' ? 'night' : 'day')}
        onOpenCopilot={() => window.dispatchEvent(new CustomEvent('wl-open-copilot'))}
      />

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
