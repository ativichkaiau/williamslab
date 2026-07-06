import { useState } from 'react'
import { useStore } from '../lib/store'
import { Kicker, Rule, HypBadge, SevDot } from '../components/ui'
import { Modal, Field } from '../components/Modal'
import { INSTABILITY_LABEL } from '../lib/palette'
import type { Hypothesis, HypothesisStatus } from '../types'

type Draft = {
  label: string
  statement: string
  direction: 'positive' | 'negative' | 'none'
  effect: string
  falsification: string
  requiresTissue: string
  status: HypothesisStatus
}

const blank: Draft = { label: '', statement: '', direction: 'negative', effect: '', falsification: '', requiresTissue: '', status: 'draft' }

function toDraft(h: Hypothesis): Draft {
  return {
    label: h.label,
    statement: h.statement,
    direction: h.prediction?.direction ?? 'none',
    effect: h.prediction?.effect ?? '',
    falsification: h.falsification ?? '',
    requiresTissue: h.requiresTissue ?? '',
    status: h.status,
  }
}

export default function Hypotheses() {
  const { state, instabilities, addHypothesis, updateHypothesis, removeHypothesis } = useStore()
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const paperTitle = (id: string) => state.papers.find((p) => p.id === id)?.title ?? id

  function save() {
    if (!editing) return
    const d = editing.draft
    const patch: Partial<Hypothesis> = {
      label: d.label || 'Untitled hypothesis',
      statement: d.statement,
      prediction: { direction: d.direction, effect: d.effect || undefined },
      falsification: d.falsification || undefined,
      requiresTissue: d.requiresTissue || undefined,
      status: d.status,
    }
    if (editing.id) updateHypothesis(editing.id, patch)
    else addHypothesis(patch as Omit<Hypothesis, 'id'>)
    setEditing(null)
  }

  return (
    <>
      <div className="page-head">
        <Rule />
        <Kicker>HYPOTHESIS GRAPH · FALSIFIABLE CLAIMS</Kicker>
        <h1>Hypotheses</h1>
        <p>Every claim carries a predicted direction, an effect size, and the observation that would kill it. Flags come live from the rigor monitor.</p>
        <div className="head-actions">
          <button className="btn primary sm" onClick={() => setEditing({ id: null, draft: { ...blank } })}>＋ New hypothesis</button>
        </div>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        {state.hypotheses.map((h) => {
          const flags = instabilities.filter((i) => i.target === h.id && i.status === 'open')
          return (
            <div className="card lg hcard" key={h.id}>
              <div className="flex">
                <h3 style={{ fontSize: 17 }}>{h.label}</h3>
                <span className="spacer" />
                <HypBadge status={h.status} />
                <div className="row-actions" style={{ marginLeft: 10 }}>
                  <button className="icon-btn" onClick={() => setEditing({ id: h.id, draft: toDraft(h) })}>Edit</button>
                  <button className="icon-btn danger" onClick={() => { if (confirm(`Delete ${h.label}?`)) removeHypothesis(h.id) }}>Delete</button>
                </div>
              </div>
              <p className="st">{h.statement}</p>

              <div className="kv"><span className="k">Prediction</span><span className="val">{h.prediction ? `${h.prediction.direction} · ${h.prediction.effect ?? '—'}` : '— none set —'}</span></div>
              <div className="kv"><span className="k">Falsified if</span><span className="val">{h.falsification ?? <em style={{ color: 'var(--red)' }}>no criterion set</em>}</span></div>
              <div className="kv"><span className="k">Requires</span><span className="val">{h.requiresTissue ?? 'any tissue'}</span></div>
              <div className="kv">
                <span className="k">Support</span>
                <span className="val">
                  {h.supportingPapers && h.supportingPapers.length > 0
                    ? h.supportingPapers.map(paperTitle).join('; ')
                    : <em style={{ color: 'var(--amber)' }}>no literature linked</em>}
                </span>
              </div>

              {flags.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="wrap-gap">
                    {flags.map((f) => <SevDot key={f.id} severity={f.severity} label={INSTABILITY_LABEL[f.type]} />)}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit hypothesis' : 'New hypothesis'} onClose={() => setEditing(null)} wide>
          <Field label="Label"><input className="input" value={editing.draft.label} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, label: e.target.value } })} placeholder="H4 · short name" /></Field>
          <Field label="Statement"><textarea className="textarea" value={editing.draft.statement} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, statement: e.target.value } })} placeholder="If … then … in whom, measured how." /></Field>
          <div className="form-row three">
            <Field label="Direction">
              <select className="select" value={editing.draft.direction} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, direction: e.target.value as Draft['direction'] } })}>
                <option value="negative">negative</option>
                <option value="positive">positive</option>
                <option value="none">none</option>
              </select>
            </Field>
            <Field label="Effect size"><input className="input" value={editing.draft.effect} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, effect: e.target.value } })} placeholder="≥25% ↓ mRNA" /></Field>
            <Field label="Status">
              <select className="select" value={editing.draft.status} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, status: e.target.value as HypothesisStatus } })}>
                <option value="draft">draft</option>
                <option value="testing">testing</option>
                <option value="supported">supported</option>
                <option value="refuted">refuted</option>
              </select>
            </Field>
          </div>
          <Field label="Falsified if" hint="Leave blank and the unclear-hypothesis sensor will flag it."><input className="input" value={editing.draft.falsification} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, falsification: e.target.value } })} placeholder="No correlation at FDR < 0.05" /></Field>
          <Field label="Requires tissue" hint="e.g. cardiomyocyte — used by the assay-mismatch sensor."><input className="input" value={editing.draft.requiresTissue} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, requiresTissue: e.target.value } })} placeholder="cardiomyocyte" /></Field>
          <div className="form-actions">
            <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>{editing.id ? 'Save changes' : 'Add hypothesis'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
