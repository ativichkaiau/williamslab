import { useMemo, useRef, useState } from 'react'
import type { GraphNode, GraphEdge } from '../types'
import { nodeColor, EVIDENCE_STYLE } from '../lib/palette'

const VBW = 1000
const VBH = 640
const R = 34

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (n: GraphNode | null) => void
  showLabels?: boolean
}

export default function GraphView({ nodes, edges, selectedId, onSelect, showLabels = true }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(nodes.map((n) => [n.id, { x: n.x ?? 500, y: n.y ?? 320 }])),
  )
  const [drag, setDrag] = useState<string | null>(null)
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // Effective position: dragged position if we have one, else the node's own
  // layout hint. This keeps nodes added *after* mount visible.
  const posOf = (id: string): { x: number; y: number } | null => {
    if (pos[id]) return pos[id]
    const n = byId.get(id)
    return n ? { x: n.x ?? 500, y: n.y ?? 320 } : null
  }

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * VBW,
      y: ((clientY - rect.top) / rect.height) * VBH,
    }
  }

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = toSvg(e.clientX, e.clientY)
    setPos((prev) => ({ ...prev, [drag]: { x: clamp(p.x, R, VBW - R), y: clamp(p.y, R, VBH - R) } }))
  }

  return (
    <svg
      ref={svgRef}
      className="graph-svg"
      viewBox={`0 0 ${VBW} ${VBH}`}
      onPointerMove={onMove}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
      onClick={(e) => {
        if (e.target === svgRef.current) onSelect?.(null)
      }}
    >
      <defs>
        {Object.entries(EVIDENCE_STYLE).map(([k, v]) => (
          <marker key={k} id={`arw-${k}`} markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill={v.color} />
          </marker>
        ))}
      </defs>

      {/* edges */}
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
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={st.color}
              strokeWidth={w}
              strokeDasharray={st.dash}
              markerEnd={`url(#arw-${e.evidence ?? 'predicted'})`}
            />
            {showLabels && (
              <text className="edge-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize="10.5">
                {e.rel}
              </text>
            )}
          </g>
        )
      })}

      {/* nodes */}
      {nodes.map((n) => {
        const p = posOf(n.id)
        if (!p) return null
        const c = nodeColor(n.type)
        const selected = selectedId === n.id
        return (
          <g
            key={n.id}
            className="graph-node"
            style={{ cursor: 'grab' }}
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
            <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="12.5">
              {n.label}
            </text>
            {n.sublabel && (
              <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize="8.5" opacity={0.85}>
                {n.sublabel}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}
