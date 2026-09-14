import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { claimText, evidenceOf, findClaim, newEvidenceId, normalizeDoi, saveClaim } from '../lib/evidence'
import type { EvidenceClaim, EvidenceLink, EvidencePassage, EvidenceStance } from '../types'
import { Modal, Field } from './Modal'
import { Markdown } from './Markdown'

export function PassageCard({ passage }: { passage: EvidencePassage }) {
  const { state } = useStore()
  const check = evidenceOf(state).notices.find((n) => n.doi === normalizeDoi(passage.doi))
  const url = passage.doi ? `https://doi.org/${encodeURIComponent(passage.doi)}` : passage.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(passage.pmid)}/` : undefined
  return <article className="evidence-passage">
    <div className="evidence-source-title">{url ? <a href={url} target="_blank" rel="noreferrer">{passage.title} ↗</a> : <b>{passage.title}</b>}</div>
    <p className="small muted">{passage.locator} · {passage.origin === 'pdf' ? `PDF text · ${passage.fileName}` : 'User-supplied text'}{passage.pmid ? ` · PMID ${passage.pmid}` : ''}</p>
    <blockquote className="exact-passage">{passage.text}</blockquote>
    <dl className="evidence-facts"><div><dt>Study design</dt><dd>{passage.design || 'Not recorded'}</dd></div><div><dt>Limitations</dt><dd>{passage.limitations || 'Not recorded'}</dd></div></dl>
    {!!check?.notices.length && <div className="evidence-warning" role="status">Publication notice: {check.notices.map((n) => n.type).join(', ')}. Review before relying on these findings.</div>}
    {check?.error && <p className="small evidence-error">Latest notice check failed. Previously found notices are retained.</p>}
  </article>
}

export function EvidenceLinks({ links }: { links: EvidenceLink[] }) {
  const { state } = useStore()
  const e = evidenceOf(state)
  return <>{(['supports', 'conflicts', 'context'] as const).map((stance) => {
    const group = links.filter((l) => l.stance === stance)
    if (!group.length) return null
    return <section className="evidence-link-group" key={stance}><h4>{stance === 'supports' ? 'Supporting evidence' : stance === 'conflicts' ? 'Conflicting evidence' : 'Context'}</h4>{group.map((l, i) => {
      const passage = e.passages.find((p) => p.id === l.passageId)
      return <div key={`${l.passageId}-${i}`}><p className="small">{l.reason || 'No interpretation recorded.'}</p>{passage ? <PassageCard passage={passage} /> : <p className="evidence-error">Source passage unavailable. This link needs review.</p>}</div>
    })}</section>
  })}</>
}

export function ClaimModal({ document, sectionId, text, onClose }: { document: EvidenceClaim['document']; sectionId: string; text: string; onClose: () => void }) {
  const { state, updateResearch } = useStore()
  const e = evidenceOf(state)
  const existing = findClaim(e.claims, document, sectionId, text)
  const [links, setLinks] = useState<EvidenceLink[]>(existing?.links ?? [])
  const [selected, setSelected] = useState('')
  const [stance, setStance] = useState<EvidenceStance>('supports')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const selectedPassage = e.passages.find((p) => p.id === selected)
  function save() {
    try {
      const claim: EvidenceClaim = { id: existing?.id ?? newEvidenceId('claim'), document, sectionId, text: claimText(text), links, updatedAt: Date.now() }
      updateResearch(state.project.id, (p) => saveClaim(p, claim), 'Saved claim evidence links')
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save evidence links.') }
  }
  return <Modal title="Trace this claim" onClose={onClose} wide>
    <blockquote className="claim-quote">{text}</blockquote>
    <p className="small muted">Passages are preserved as supplied. Evidence relationships and study assessments are reviewer interpretations.</p>
    {!links.length && <p className="empty">No evidence attached yet. This claim has not been verified here.</p>}
    <EvidenceLinks links={links} />
    {!!links.length && <div className="wrap-gap">{links.map((l, i) => <button className="btn ghost sm" key={i} onClick={() => { setLinks(links.filter((_, n) => i !== n)); setDirty(true) }}>Remove {l.stance} link {i + 1}</button>)}</div>}
    <details className="evidence-attach" open={!links.length}>
      <summary>Attach a source passage</summary>
      {e.passages.length ? <>
        <Field label="Source passage"><select className="select" value={selected} onChange={(ev) => setSelected(ev.target.value)}><option value="">Choose a passage…</option>{e.passages.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.locator}</option>)}</select></Field>
        {selectedPassage && <PassageCard passage={selectedPassage} />}
        <Field label="Relationship to this claim"><select className="select" value={stance} onChange={(ev) => setStance(ev.target.value as EvidenceStance)}><option value="supports">Supports</option><option value="conflicts">Conflicts</option><option value="context">Context</option></select></Field>
        <Field label="Why this passage matters"><textarea className="textarea" value={reason} rows={2} onChange={(ev) => setReason(ev.target.value)} placeholder="Explain the finding, its relevance and any qualification." /></Field>
        <button className="btn ghost sm" disabled={!selected || !reason.trim()} onClick={() => { setLinks([...links.filter((l) => l.passageId !== selected), { passageId: selected, stance, reason: reason.trim() }]); setSelected(''); setReason(''); setDirty(true) }}>Attach passage</button>
      </> : <p className="small">Add an exact passage to the evidence library first.</p>}
      <Link to="/evidence" className="btn ghost sm" onClick={onClose}>Open evidence library →</Link>
    </details>
    {error && <p role="alert" className="evidence-error">{error}</p>}
    <div className="form-actions"><button className="btn ghost" onClick={onClose}>Close</button><button className="btn primary" disabled={!dirty} onClick={save}>Save evidence links</button></div>
  </Modal>
}

function plainNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(plainNode).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return plainNode(node.props.children)
  return ''
}

// Leave the prose and its existing links intact; the inline button supplies a
// keyboard target, and clicking the claim text opens the same evidence panel.
export function TraceableText({ document, sectionId, children }: { document: EvidenceClaim['document']; sectionId: string; children: ReactNode }) {
  const { state } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const claims = evidenceOf(state).claims
  const annotate = (content: ReactNode): ReactNode => {
    const text = claimText(plainNode(content))
    if (!text || text.length < 12) return content
    const claim = findClaim(claims, document, sectionId, text)
    const count = claim?.links.length ?? 0
    return <span className={`traceable-claim${count ? ' traced' : ''}`} onClick={(event) => {
      if ((event.target as HTMLElement).closest('a,button,input,select') || window.getSelection()?.toString()) return
      setSelected(text)
    }}>{content}<button className="evidence-marker" data-evidence-ui="true" aria-label={`Evidence for: ${text.slice(0, 80)}`} title={count ? `${count} linked passage${count === 1 ? '' : 's'}` : 'Attach or inspect evidence for this claim'} onClick={() => setSelected(text)}>↗{count ? ` ${count}` : ''}</button></span>
  }
  const walk = (nodes: ReactNode): ReactNode => Children.map(nodes, (node) => {
    if (!isValidElement(node)) return node
    const el = node as ReactElement<{ children?: ReactNode; renderClaim?: (children: ReactNode) => ReactNode }>
    if (el.type === Markdown) return cloneElement(el, { renderClaim: annotate })
    if (['p', 'li', 'td'].includes(String(el.type)) && !Children.toArray(el.props.children).some((c) => isValidElement(c) && ['p', 'ul', 'ol', 'table'].includes(String(c.type)))) return cloneElement(el, {}, annotate(el.props.children))
    return el.props.children ? cloneElement(el, {}, walk(el.props.children)) : el
  })
  return <>{walk(children)}{selected && <ClaimModal key={`${document}-${sectionId}-${selected}`} document={document} sectionId={sectionId} text={selected} onClose={() => setSelected(null)} />}</>
}
