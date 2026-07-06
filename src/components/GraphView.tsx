import { useMemo, useRef, useState, useEffect } from 'react'
import type { GraphNode, GraphEdge } from '../types'
import { nodeColor, EVIDENCE_STYLE } from '../lib/palette'

// Large logical canvas; pan/zoom give effectively unbounded working space.
const VBW = 1400
const VBH = 900
const R = 34

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (n: GraphNode | null) => void
  showLabels?: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function GraphView({ nodes, edges, selectedId, onSelect, showLabels = true }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(nodes.map((n) => [n.id, { x: n.x ?? VBW / 2, y: n.y ?? VBH / 2 }])),
  )
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 })
  const [drag, setDrag] = useState<string | null>(null)
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null)
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const posOf = (id: string): { x: number; y: number } | null => {
    if (pos[id]) return pos[id]
    const n = byId.get(id)
    return n ? { x: n.x ?? VBW / 2, y: n.y ?? VBH / 2 } : null
  }

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: ((clientX - rect.left) / rect.width) * VBW, y: ((clientY - rect.top) / rect.height) * VBH }
  }
  const toWorld = (s: { x: number; y: number }) => ({ x: (s.x - view.tx) / view.k, y: (s.y - view.ty) / view.k })

  const zoomAround = (cx: number, cy: number, factor: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, 0.3, 2.6)
      const wx = (cx - v.tx) / v.k
      const wy = (cy - v.ty) / v.k
      return { k, tx: cx - wx * k, ty: cy - wy * k }
    })
  }

  // wheel zoom (attached non-passively so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = toSvg(e.clientX, e.clientY)
      zoomAround(s.x, s.y, e.deltaY < 0 ? 1.12 : 0.89)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.k, view.tx, view.ty])

  const onMove = (e: React.PointerEvent) => {
    if (drag) {
      const w = toWorld(toSvg(e.clientX, e.clientY))
      setPos((p) => ({ ...p, [drag]: { x: clamp(w.x, -300, VBW + 300), y: clamp(w.y, -300, VBH + 300) } }))
    } else if (pan) {
      const s = toSvg(e.clientX, e.clientY)
      setView((v) => ({ ...v, tx: v.tx + (s.x - pan.x), ty: v.ty + (s.y - pan.y) }))
      setPan(s)
    }
  }
  const endPointer = () => {
    setDrag(null)
    setPan(null)
  }

  // frame all nodes on first mount
  useEffect(() => {
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fit = () => {
    if (!nodes.length) return
    const ps = nodes.map((n) => posOf(n.id)!).filter(Boolean)
    const minX = Math.min(...ps.map((p) => p.x)) - R
    const maxX = Math.max(...ps.map((p) => p.x)) + R
    const minY = Math.min(...ps.map((p) => p.y)) - R
    const maxY = Math.max(...ps.map((p) => p.y)) + R
    const pad = 70
    const k = clamp(Math.min((VBW - 2 * pad) / (maxX - minX || 1), (VBH - 2 * pad) / (maxY - minY || 1)), 0.3, 2)
    setView({ k, tx: pad - minX * k + (VBW - 2 * pad - (maxX - minX) * k) / 2, ty: pad - minY * k + (VBH - 2 * pad - (maxY - minY) * k) / 2 })
  }

  return (
    <div className="graph-canvas">
      <div className="graph-toolbar">
        <button className="icon-btn" onClick={() => zoomAround(VBW / 2, VBH / 2, 0.83)} title="Zoom out">−</button>
        <span className="zoom-lvl mono">{Math.round(view.k * 100)}%</span>
        <button className="icon-btn" onClick={() => zoomAround(VBW / 2, VBH / 2, 1.2)} title="Zoom in">+</button>
        <button className="icon-btn" onClick={fit} title="Fit all nodes">Fit</button>
        <button className="icon-btn" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} title="Reset view">Reset</button>
      </div>
      <svg
        ref={svgRef}
        className="graph-svg"
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onMove}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
        style={{ cursor: pan ? 'grabbing' : 'grab' }}
      >
        <defs>
          {Object.entries(EVIDENCE_STYLE).map(([k, v]) => (
            <marker key={k} id={`arw-${k}`} markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill={v.color} />
            </marker>
          ))}
        </defs>

        {/* background — pan surface + deselect */}
        <rect
          x={0}
          y={0}
          width={VBW}
          height={VBH}
          fill="transparent"
          onPointerDown={(e) => setPan(toSvg(e.clientX, e.clientY))}
          onClick={() => onSelect?.(null)}
        />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {edges.map((e) => {
            const a = posOf(e.src)
            const b = posOf(e.dst)
            if (!a || !b) return null
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.hypot(dx, dy) || 1
            const ux = dx / len
            const uy = dy / len
            const x1 = a.x + ux * R
            const y1 = a.y + uy * R
            const x2 = b.x - ux * (R + 4)
            const y2 = b.y - uy * (R + 4)
            const st = EVIDENCE_STYLE[e.evidence ?? 'predicted']
            const w = 1 + (e.strength ?? 0.3) * 3.2
            return (
              <g className="graph-edge" key={e.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={st.color} strokeWidth={w} strokeDasharray={st.dash} markerEnd={`url(#arw-${e.evidence ?? 'predicted'})`} />
                {showLabels && (
                  <text className="edge-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize="10.5">
                    {e.rel}
                  </text>
                )}
              </g>
            )
          })}

          {nodes.map((n) => {
            const p = posOf(n.id)
            if (!p) return null
            const c = nodeColor(n.type)
            const selected = selectedId === n.id
            return (
              <g
                key={n.id}
                className="graph-node"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setDrag(n.id)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(byId.get(n.id) ?? null)
                }}
              >
                {selected && <circle cx={p.x} cy={p.y} r={R + 6} fill="none" stroke={c} strokeWidth={2.5} opacity={0.5} />}
                <circle cx={p.x} cy={p.y} r={R} fill={c} stroke="#fff" strokeWidth={2} />
                <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="12.5">{n.label}</text>
                {n.sublabel && (
                  <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize="8.5" opacity={0.85}>{n.sublabel}</text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
