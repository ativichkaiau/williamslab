import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import GraphView from '../components/GraphView'
import { Kicker, Rule } from '../components/ui'
import { NODE_COLORS, nodeColor } from '../lib/palette'
import type { GraphNode, NodeType } from '../types'

export default function Graph() {
  const { state } = useStore()
  const [sel, setSel] = useState<GraphNode | null>(null)
  const [labels, setLabels] = useState(true)

  const usedTypes = useMemo(() => {
    const set = new Set<NodeType>(state.nodes.map((n) => n.type))
    return (Object.keys(NODE_COLORS) as NodeType[]).filter((t) => set.has(t))
  }, [state.nodes])

  const label = (id: string) => state.nodes.find((n) => n.id === id)?.label ?? id

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>RESEARCH KNOWLEDGE GRAPH · ONE GRAPH, EVERYTHING ON IT</Kicker>
        <h1>Knowledge Graph</h1>
        <p>Genes, variants, marks, regions, cell types, assays, phenotypes, drugs, papers and hypotheses on a single typed graph. Drag to rearrange; click for detail.</p>
      </div>

      <div className="graph-wrap">
        <div>
          <GraphView nodes={state.nodes} edges={state.edges} selectedId={sel?.id} onSelect={setSel} showLabels={labels} />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="card-h" style={{ margin: 0 }}>NODE TYPES</div>
              <label className="flex small" style={{ cursor: 'pointer', gap: 6 }}>
                <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> edge labels
              </label>
            </div>
            <div className="legend-row">
              {usedTypes.map((t) => (
                <span className="lg" key={t}>
                  <i style={{ background: NODE_COLORS[t] }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="card detail">
          <div className="card-h">SELECTED NODE</div>
          {sel ? (
            <dl>
              <dt>Label</dt>
              <dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: nodeColor(sel.type) }} />
                {sel.label} {sel.sublabel && <span className="small">· {sel.sublabel}</span>}
              </dd>
              <dt>Type</dt>
              <dd>{sel.type}</dd>
              <dt>Id</dt>
              <dd><code className="inl">{sel.id}</code></dd>
              <dt>Connected edges</dt>
              <dd>
                {state.edges
                  .filter((e) => e.src === sel.id || e.dst === sel.id)
                  .map((e) => (
                    <div key={e.id} className="small" style={{ marginTop: 4 }}>
                      {label(e.src)} <span style={{ color: 'var(--red)' }}>{e.rel}</span> {label(e.dst)}
                      {e.evidence && <span className="muted"> · {e.evidence}</span>}
                    </div>
                  ))}
              </dd>
            </dl>
          ) : (
            <p className="empty">Click a node to inspect it.</p>
          )}
        </div>
      </div>
    </>
  )
}
