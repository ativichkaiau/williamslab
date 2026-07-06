import { useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, AssayBadge, SevDot } from '../components/ui'
import { Modal, Field } from '../components/Modal'
import { INSTABILITY_LABEL } from '../lib/palette'
import type { Assay, AssayStatus } from '../types'

type Draft = {
  method: string
  measures: string
  cellType: string
  controls: string
  sampleN: string
  phase: string
  effort: 'low' | 'med' | 'high'
  status: AssayStatus
  genomeWide: boolean
  expectedEffect: string
  genomeWideTests: string
  claims: string[]
}

const blank: Draft = { method: '', measures: '', cellType: 'iPSC-CM', controls: '', sampleN: '', phase: '1', effort: 'med', status: 'design', genomeWide: false, expectedEffect: '', genomeWideTests: '', claims: [] }

function toDraft(a: Assay): Draft {
  return {
    method: a.method, measures: a.measures, cellType: a.cellType, controls: a.controls ?? '',
    sampleN: a.sampleN?.toString() ?? '', phase: a.phase?.toString() ?? '', effort: a.effort ?? 'med',
    status: a.status, genomeWide: !!a.genomeWide, expectedEffect: a.expectedEffect?.toString() ?? '',
    genomeWideTests: a.genomeWideTests?.toString() ?? '', claims: a.claims ?? [],
  }
}

const STATUSES: AssayStatus[] = ['design', 'queued', 'piloting', 'running', 'done', 'blocked']

export default function Assays() {
  const { state, instabilities, addAssay, updateAssay, removeAssay } = useStore()
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const hypLabel = (id: string) => state.hypotheses.find((h) => h.id === id)?.label.split('·')[0].trim() ?? id
  const flagsFor = (id: string) => instabilities.filter((i) => i.target === id && i.status === 'open')

  function save() {
    if (!editing) return
    const d = editing.draft
    const patch: Partial<Assay> = {
      method: d.method || 'New assay', measures: d.measures, cellType: d.cellType, controls: d.controls,
      sampleN: d.sampleN ? Math.round(+d.sampleN) : undefined,
      phase: d.phase ? (Math.min(3, Math.max(1, +d.phase)) as 1 | 2 | 3) : undefined,
      effort: d.effort, status: d.status, genomeWide: d.genomeWide,
      expectedEffect: d.expectedEffect ? +d.expectedEffect : undefined,
      genomeWideTests: d.genomeWideTests ? Math.round(+d.genomeWideTests) : undefined,
      claims: d.claims,
    }
    if (editing.id) updateAssay(editing.id, patch)
    else addAssay(patch as Omit<Assay, 'id'>)
    setEditing(null)
  }

  const set = (patch: Partial<Draft>) => editing && setEditing({ ...editing, draft: { ...editing.draft, ...patch } })

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>ASSAY PLANNER · CLAIM ↔ ASSAY MATRIX</Kicker>
        <h1>Assays</h1>
        <p>Each assay is bound to the hypotheses it addresses and the cell type it runs in. The suspension array audits controls, power, and tissue match in the right-hand column.</p>
        <div className="head-actions">
          <button className="btn primary sm" onClick={() => setEditing({ id: null, draft: { ...blank } })}>＋ New assay</button>
        </div>
      </div>

      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>
              <th>Assay</th><th>Measures</th><th>Cell type</th><th>Controls</th><th>n</th><th>Phase</th><th>Status</th><th>Claims</th><th>Flags</th><th></th>
            </tr>
          </thead>
          <tbody>
            {state.assays.map((a) => {
              const flags = flagsFor(a.id)
              return (
                <tr key={a.id}>
                  <td><b>{a.method}</b>{a.genomeWide && <div className="small">genome-wide</div>}</td>
                  <td className="muted">{a.measures}</td>
                  <td className="muted">{a.cellType}</td>
                  <td style={a.controls ? undefined : { color: 'var(--red)', fontWeight: 700 }}>{a.controls || 'none'}</td>
                  <td className="mono">{a.sampleN ?? '—'}</td>
                  <td className="mono">{a.phase ?? '—'}</td>
                  <td><AssayBadge status={a.status} /></td>
                  <td className="wrap-gap">{(a.claims ?? []).map((c) => <span className="chip" key={c}>{hypLabel(c)}</span>)}</td>
                  <td>{flags.length === 0 ? <span className="small" style={{ color: 'var(--green)' }}>clear</span> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{flags.map((f) => <SevDot key={f.id} severity={f.severity} label={INSTABILITY_LABEL[f.type]} />)}</div>
                  )}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditing({ id: a.id, draft: toDraft(a) })}>Edit</button>
                      <button className="icon-btn danger" onClick={() => { if (confirm(`Delete ${a.method}?`)) removeAssay(a.id) }}>Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit assay' : 'New assay'} onClose={() => setEditing(null)} wide>
          <div className="form-row">
            <Field label="Method"><input className="input" value={editing.draft.method} onChange={(e) => set({ method: e.target.value })} placeholder="CUT&Tag" /></Field>
            <Field label="Measures"><input className="input" value={editing.draft.measures} onChange={(e) => set({ measures: e.target.value })} placeholder="H3K27me3 occupancy" /></Field>
          </div>
          <div className="form-row">
            <Field label="Cell type"><input className="input" value={editing.draft.cellType} onChange={(e) => set({ cellType: e.target.value })} placeholder="iPSC-CM" /></Field>
            <Field label="Controls" hint="Blank → missing-control flag."><input className="input" value={editing.draft.controls} onChange={(e) => set({ controls: e.target.value })} placeholder="isogenic corrected" /></Field>
          </div>
          <div className="form-row three">
            <Field label="Sample n (total)"><input className="input" type="number" min="0" value={editing.draft.sampleN} onChange={(e) => set({ sampleN: e.target.value })} /></Field>
            <Field label="Phase">
              <select className="select" value={editing.draft.phase} onChange={(e) => set({ phase: e.target.value })}>
                <option value="">—</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
              </select>
            </Field>
            <Field label="Effort">
              <select className="select" value={editing.draft.effort} onChange={(e) => set({ effort: e.target.value as Draft['effort'] })}>
                <option value="low">low</option><option value="med">med</option><option value="high">high</option>
              </select>
            </Field>
          </div>
          <div className="form-row three">
            <Field label="Status">
              <select className="select" value={editing.draft.status} onChange={(e) => set({ status: e.target.value as AssayStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Expected effect (d)" hint="blank → 1.0 / 0.8 gw"><input className="input" type="number" step="0.1" value={editing.draft.expectedEffect} onChange={(e) => set({ expectedEffect: e.target.value })} /></Field>
            <Field label="Genome-wide tests" hint="blank → 100,000"><input className="input" type="number" value={editing.draft.genomeWideTests} onChange={(e) => set({ genomeWideTests: e.target.value })} /></Field>
          </div>
          <label className={`check${editing.draft.genomeWide ? ' on' : ''}`} style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={editing.draft.genomeWide} onChange={(e) => set({ genomeWide: e.target.checked })} /> Genome-wide (multiple-testing tax on power)
          </label>
          <Field label="Addresses hypotheses">
            <div className="checks">
              {state.hypotheses.map((h) => {
                const on = editing.draft.claims.includes(h.id)
                return (
                  <label key={h.id} className={`check${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={(e) => set({ claims: e.target.checked ? [...editing.draft.claims, h.id] : editing.draft.claims.filter((c) => c !== h.id) })} />
                    {hypLabel(h.id)}
                  </label>
                )
              })}
            </div>
          </Field>
          <div className="form-actions">
            <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>{editing.id ? 'Save changes' : 'Add assay'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
