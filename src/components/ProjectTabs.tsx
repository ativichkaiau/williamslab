import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'

export function ProjectTabs() {
  const { projects, activeId, switchProject } = useStore()
  const tabsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return
    const keepActiveVisible = () => {
      const selected = tabs.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      if (!selected) return
      const container = tabs.getBoundingClientRect()
      const button = selected.getBoundingClientRect()
      if (button.left < container.left + 2) tabs.scrollLeft += button.left - container.left - 2
      else if (button.right > container.right - 2) tabs.scrollLeft += button.right - container.right + 2
    }
    keepActiveVisible()
    const observer = new ResizeObserver(keepActiveVisible)
    observer.observe(tabs)
    return () => observer.disconnect()
  }, [activeId, projects.length])

  return (
    <div className="project-scope">
      <div className="project-scope-label"><span>PROJECTS <b>{projects.length}</b></span><Link to="/portfolio">Manage projects ↗</Link></div>
      <nav ref={tabsRef} className="project-tabs" aria-label="Choose project">
        {projects.map((p) => (
          <button key={p.id} className={`project-tab${p.id === activeId ? ' active' : ''}`} onClick={() => switchProject(p.id)} aria-pressed={p.id === activeId} title={p.name}>
            <span className="project-tab-code">{p.code || 'PROJECT'}<span>{p.stage ?? 'Idea'}</span></span>
            <span className="project-tab-name">{p.name}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
