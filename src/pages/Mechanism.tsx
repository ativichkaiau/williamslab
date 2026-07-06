import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import GraphView from '../components/GraphView'
import { Kicker, Rule } from '../components/ui'
import { EVIDENCE_STYLE, nodeColor } from '../lib/palette'
import type { GraphNode, Evidence } from '../types'

const MECH_RELS = new Set(['represses', 'reduces', 'associated_with', 'regulates', 'loops_to', 'deposited_on', 'modulates', 'unmasks'])
const EV_ORDER: Record<Evidence, number> = { none: 0, predicted: 1, correlational: 2, causal: 3, established: 4 }

export default function Mechanism() {
  const { state, updateNode } = useStore()
  const [sel, setSel] = useState<GraphNode | null>(null)

  const edges = useMemo(() => state.edges.filter((e) => MECH_RELS.has(e.rel)), [state.edges])
  const nodeIds = useMemo(() => new Set(edges.flatMap((e) => [e.src, e.dst])), [edges])
  const nodes = useMemo(() => state.nodes.filter((n) => nodeIds.has(n.id)), [state.nodes, nodeIds])

  // weakest link = softest evidence, then lowest strength
  const weakest = useMemo(
    () =>
      [...edges].sort((a, b) => {
        const ea = EV_ORDER[a.evidence ?? 'predicted'] - EV_ORDER[b.evidence ?? 'predicted']
        return ea !== 0 ? ea : (a.strength ?? 0) - (b.strength ?? 0)
      })[0],
    [edges],
  )
  const label = (id: string) => state.nodes.find((n) => n.id === id)?.label ?? id

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>MECHANISM MAP · MOLECULE → PHENOTYPE</Kicker>
        <h1>Mechanism Map</h1>
        <p>The causal chain from molecule to phenotype, each edge coloured by how well-supported it is. Drag nodes to rearrange; click one for detail. Dashed / amber edges are the weak, unproven links.</p>
      </div>

      <div className="graph-wrap">
        <div>
          <GraphView nodes={nodes} edges={edges} selectedId={sel?.id} onSelect={setSel} onNodeMove={(id, x, y) => updateNode(id, { x, y })} />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="legend-row">
              {(Object.keys(EVIDENCE_STYLE) as Evidence[]).map((k) => (
                <span className="lg" key={k}>
                  <i style={{ background: EVIDENCE_STYLE[k].color }} />
                  {EVIDENCE_STYLE[k].label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <dt>Edges</dt>
                <dd>
                  {edges
                    .filter((e) => e.src === sel.id || e.dst === sel.id)
                    .map((e) => (
                      <div key={e.id} className="small" style={{ marginTop: 4 }}>
                        {label(e.src)} <span style={{ color: 'var(--red)' }}>{e.rel}</span> {label(e.dst)} · {e.evidence}
                      </div>
                    ))}
                </dd>
              </dl>
            ) : (
              <p className="empty">Click a node to inspect its edges.</p>
            )}
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--red)' }}>
            <div className="card-h"><span className="sq" style={{ background: 'var(--red)' }} />WEAKEST LINK</div>
            {weakest && (
              <>
                <p style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {label(weakest.src)} <span style={{ color: 'var(--red)' }}>{weakest.rel}</span> {label(weakest.dst)}
                </p>
                <p className="small" style={{ marginTop: 6 }}>
                  Evidence: <b>{weakest.evidence}</b> · strength {Math.round((weakest.strength ?? 0) * 100)}%.
                  {(!weakest.testedBy || weakest.testedBy.length === 0)
                    ? ' No assay bridges this edge yet — this is the weakest step in the causal chain.'
                    : ` Bridged by: ${weakest.testedBy.join(', ')}.`}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
