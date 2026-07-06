import { useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule } from '../components/ui'
import { Modal, Field } from '../components/Modal'
import { studyEffect, fmt } from '../lib/metaAnalysis'
import type { Study, RobLevel } from '../types'

const ROB_COLOR: Record<RobLevel, string> = { low: 'var(--green)', some: 'var(--amber)', high: 'var(--red)' }
const LEVELS: RobLevel[] = ['low', 'some', 'high']

type Draft = {
  author: string
  year: string
  pmid: string
  design: string
  expEvents: string
  expTotal: string
  ctrlEvents: string
  ctrlTotal: string
  include: boolean
  rob: Record<string, RobLevel>
  note: string
}

function toDraft(s: Study, domains: string[]): Draft {
  return {
    author: s.author, year: String(s.year), pmid: s.pmid ?? '', design: s.design ?? '',
    expEvents: s.expEvents?.toString() ?? '', expTotal: s.expTotal?.toString() ?? '',
    ctrlEvents: s.ctrlEvents?.toString() ?? '', ctrlTotal: s.ctrlTotal?.toString() ?? '',
    include: s.include, rob: Object.fromEntries(domains.map((d) => [d, s.rob?.[d] ?? 'some'])), note: s.note ?? '',
  }
}

export default function Studies() {
  const { state, addStudy, updateStudy, removeStudy } = useStore()
  const r = state.review
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const blank: Draft = { author: '', year: '2024', pmid: '', design: 'cohort', expEvents: '', expTotal: '', ctrlEvents: '', ctrlTotal: '', include: true, rob: Object.fromEntries(r.robDomains.map((d) => [d, 'some'])), note: '' }

  function save() {
    if (!editing) return
    const d = editing.draft
    const patch: Partial<Study> = {
      author: d.author || 'Unknown', year: +d.year || new Date().getFullYear(), pmid: d.pmid || undefined, design: d.design || undefined,
      expEvents: d.expEvents === '' ? undefined : Math.max(0, Math.round(+d.expEvents)),
      expTotal: d.expTotal === '' ? undefined : Math.max(0, Math.round(+d.expTotal)),
      ctrlEvents: d.ctrlEvents === '' ? undefined : Math.max(0, Math.round(+d.ctrlEvents)),
      ctrlTotal: d.ctrlTotal === '' ? undefined : Math.max(0, Math.round(+d.ctrlTotal)),
      include: d.include, rob: d.rob, note: d.note || undefined,
    }
    if (editing.id) updateStudy(editing.id, patch)
    else addStudy(patch as Omit<Study, 'id'>)
    setEditing(null)
  }
  const set = (patch: Partial<Draft>) => editing && setEditing({ ...editing, draft: { ...editing.draft, ...patch } })

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>SYSTEMATIC REVIEW · DATA EXTRACTION</Kicker>
        <h1 style={{ marginTop: 12 }}>Included studies</h1>
        <p>{r.indexLabel} vs {r.comparatorLabel} → {r.outcomeLabel}. Toggle inclusion, edit the extracted 2×2 counts, and rate risk of bias.</p>
        <div className="head-actions">
          <button className="btn primary sm" onClick={() => setEditing({ id: null, draft: { ...blank } })}>＋ Add study</button>
        </div>
      </div>

      <div className="err" style={{ background: 'var(--warn)', color: 'var(--warn-ink)', border: '1px solid color-mix(in srgb,var(--amber) 30%,var(--line))', marginBottom: 16 }}>
        ⚠ Study identities are real (PubMed), but the 2×2 event counts are <b>example values</b> — replace them with your extracted data.
      </div>

      <div className="tbl-scroll">
        <table>
          <thead>
            <tr><th>In</th><th>Study</th><th>Design</th><th>{r.indexLabel}</th><th>{r.comparatorLabel}</th><th>{r.effect} [95% CI]</th>{r.robDomains.map((d) => <th key={d}>{d.slice(0, 4)}</th>)}<th></th></tr>
          </thead>
          <tbody>
            {r.studies.map((s) => {
              const eff = studyEffect(s)
              return (
                <tr key={s.id} style={s.include ? undefined : { opacity: 0.5 }}>
                  <td><input type="checkbox" checked={s.include} onChange={(e) => updateStudy(s.id, { include: e.target.checked })} /></td>
                  <td>
                    <b>{s.author} {s.year}</b>
                    {s.pmid && <div className="small mono"><a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noreferrer">PMID {s.pmid} ↗</a></div>}
                  </td>
                  <td className="muted">{s.design ?? '—'}</td>
                  <td className="mono">{s.expEvents ?? '—'}/{s.expTotal ?? '—'}</td>
                  <td className="mono">{s.ctrlEvents ?? '—'}/{s.ctrlTotal ?? '—'}</td>
                  <td className="mono">{eff ? `${fmt(eff.or)} [${fmt(eff.low)}, ${fmt(eff.high)}]` : <span className="muted">no data</span>}</td>
                  {r.robDomains.map((d) => (
                    <td key={d}><span className="rob-dot" style={{ background: ROB_COLOR[s.rob?.[d] ?? 'some'] }} title={`${d}: ${s.rob?.[d] ?? 'some'}`} /></td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditing({ id: s.id, draft: toDraft(s, r.robDomains) })}>Edit</button>
                      <button className="icon-btn danger" onClick={() => { if (confirm(`Remove ${s.author} ${s.year}?`)) removeStudy(s.id) }}>Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex" style={{ gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <span className="small">Risk of bias:</span>
        {LEVELS.map((l) => <span key={l} className="flex small" style={{ gap: 6 }}><span className="rob-dot" style={{ background: ROB_COLOR[l] }} />{l}</span>)}
        <span className="spacer" />
        <span className="small">{r.studies.filter((s) => s.include).length} of {r.studies.length} included</span>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit study' : 'Add study'} onClose={() => setEditing(null)} wide>
          <div className="form-row three">
            <Field label="Author"><input className="input" value={editing.draft.author} onChange={(e) => set({ author: e.target.value })} placeholder="Priori" /></Field>
            <Field label="Year"><input className="input" type="number" value={editing.draft.year} onChange={(e) => set({ year: e.target.value })} /></Field>
            <Field label="PMID"><input className="input" value={editing.draft.pmid} onChange={(e) => set({ pmid: e.target.value })} /></Field>
          </div>
          <Field label="Design"><input className="input" value={editing.draft.design} onChange={(e) => set({ design: e.target.value })} placeholder="prospective cohort" /></Field>
          <div className="form-row">
            <Field label={`${r.indexLabel} — events`}><input className="input" type="number" value={editing.draft.expEvents} onChange={(e) => set({ expEvents: e.target.value })} /></Field>
            <Field label={`${r.indexLabel} — total`}><input className="input" type="number" value={editing.draft.expTotal} onChange={(e) => set({ expTotal: e.target.value })} /></Field>
          </div>
          <div className="form-row">
            <Field label={`${r.comparatorLabel} — events`}><input className="input" type="number" value={editing.draft.ctrlEvents} onChange={(e) => set({ ctrlEvents: e.target.value })} /></Field>
            <Field label={`${r.comparatorLabel} — total`}><input className="input" type="number" value={editing.draft.ctrlTotal} onChange={(e) => set({ ctrlTotal: e.target.value })} /></Field>
          </div>
          <Field label="Risk of bias">
            <div className="form-row three">
              {r.robDomains.map((d) => (
                <label key={d} className="field" style={{ margin: 0 }}>
                  <span className="field-l">{d}</span>
                  <select className="select" value={editing.draft.rob[d]} onChange={(e) => set({ rob: { ...editing.draft.rob, [d]: e.target.value as RobLevel } })}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </Field>
          <label className={`check${editing.draft.include ? ' on' : ''}`} style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={editing.draft.include} onChange={(e) => set({ include: e.target.checked })} /> Include in meta-analysis
          </label>
          <div className="form-actions">
            <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>{editing.id ? 'Save' : 'Add study'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
