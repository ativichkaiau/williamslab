import { useState } from 'react'
import { Kicker, Rule, StatCard } from '../components/ui'
import { useLitLink, cohortStats, PHASES, OUTCOME_META, type LitGroup, type GroupOutcome, type PhaseStatus } from '../lib/litlink'

const STATUS_LABEL: Record<PhaseStatus, string> = { 'not-started': 'Not started', active: 'Active', done: 'Done' }
const STATUS_COLOR: Record<PhaseStatus, string> = { 'not-started': '#9aa3bd', active: '#0891b2', done: '#12b981' }

export default function LitLink() {
  const ll = useLitLink()
  const { state } = ll
  const stats = cohortStats(state)
  const [selected, setSelected] = useState<string | null>(null)
  const [about, setAbout] = useState(false)
  const group = state.groups.find((g) => g.id === selected) ?? null

  if (group) return <GroupDetail group={group} ll={ll} onBack={() => setSelected(null)} />

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>PROGRAM · MENTORED LITERATURE REVIEW</Kicker>
            <h1 style={{ marginTop: 12 }}>LitLink</h1>
            <p>Groups of 3–4 น้อง, each with a <b>Mentor</b> and an <b>ACAD</b>, build from foundations to a focused review — ending in a Research Question, a Reflection, or a supported step-out. Track every group across the three phases.</p>
          </div>
          <div className="row-actions" style={{ flex: 'none', gap: 8 }}>
            <button className="btn ghost sm" onClick={() => setAbout((a) => !a)}>{about ? 'Hide' : 'About the program'}</button>
            <button className="btn primary sm" onClick={() => { const id = ll.addGroup(''); setSelected(id) }}>＋ Add group</button>
          </div>
        </div>
      </div>

      {about && (
        <div className="card lg" style={{ marginBottom: 16, borderLeft: '4px solid var(--accent, #0891b2)' }}>
          <div className="card-h"><span className="sq" style={{ background: '#0891b2' }} />WHY LITLINK WORKS THIS WAY</div>
          <div className="grid g2">
            <div>
              <p className="small"><b>Last year's problems.</b></p>
              <ul className="small">
                <li>Findings went nowhere — no path into real research, and some groups dropped out.</li>
                <li>Heavy work done <i>just to present</i>, with little benefit back to the student.</li>
              </ul>
            </div>
            <div>
              <p className="small"><b>The fix.</b></p>
              <ul className="small">
                <li><b>Foundations first</b> — build base knowledge before the specific topic: more flexible with professors, useful for coursework, and better questions (a Research Question = one current knowledge can't yet answer).</li>
                <li><b>Flexible endpoint</b> — a Research Question isn't mandatory; a group can pivot to a <b>Reflection</b> on their process.</li>
                <li><b>Supported drop-out</b> — stepping out is OK, with the Mentor's help.</li>
              </ul>
            </div>
          </div>
          <div className="divider" />
          <p className="small"><b>Roles.</b> Each group of 3–4 น้อง has a <b>Mentor</b> (advice, feedback, information, lit-review & research support) and an <b>ACAD</b> (the liaison between the research side and the group + mentor — facilitates scheduling and may join the review). Duties are split across the three phases below.</p>
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <StatCard value={stats.groups} label="Active groups" sub={`${state.cohort}`} tone="#0891b2" />
        <StatCard value={stats.members} label="น้อง (juniors)" sub={`${(stats.members / Math.max(1, stats.groups)).toFixed(1)} per group`} tone="#1746d1" />
        <StatCard value={stats.completed} label="Reached an outcome" sub={`${stats.outcomes['research-question']} RQ · ${stats.outcomes.reflection} reflection`} tone="#12b981" />
        <StatCard value={stats.outcomes.dropped} label="Stepped out" sub="supported, no penalty" tone="#f59e0b" />
      </div>

      {/* phase pipeline */}
      <div className="grid g3" style={{ marginBottom: 16 }}>
        {PHASES.map((p, i) => (
          <div className="card lg" key={p.key} style={{ borderTop: `3px solid ${p.accent}` }}>
            <div className="card-h" style={{ justifyContent: 'space-between' }}>
              <span><span className="sq" style={{ background: p.accent }} />PHASE {p.n} · {p.title.toUpperCase()}</span>
              <span className="pill" style={{ borderColor: p.accent, color: p.accent }}>{stats.byPhase[i]} group{stats.byPhase[i] === 1 ? '' : 's'}</span>
            </div>
            <p className="small mono muted" style={{ marginTop: -4 }}>{p.thai}</p>
            <p className="small">{p.goal}</p>
            <div className="divider" />
            <p className="small"><b>Mentor:</b> {p.mentor}</p>
            <p className="small"><b>ACAD:</b> {p.acad}</p>
          </div>
        ))}
      </div>

      <div className="card lg">
        <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />GROUPS · {state.groups.length}</div>
        <div className="tbl-scroll" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr><th>Group</th><th>Topic</th><th>น้อง</th><th>Mentor / ACAD</th><th>Phase</th><th>Outcome</th><th></th></tr>
            </thead>
            <tbody>
              {state.groups.map((g) => (
                <tr key={g.id}>
                  <td><b>{g.name}</b></td>
                  <td className="small">{g.topic || <span className="muted">— topic TBD —</span>}</td>
                  <td className="mono">{g.members.length}</td>
                  <td className="small">{g.mentor || '—'}<div className="mono muted" style={{ fontSize: 11 }}>{g.acad || '—'}</div></td>
                  <td><PhaseTrack current={g.currentPhase} dropped={g.outcome === 'dropped'} /></td>
                  <td><OutcomeBadge outcome={g.outcome} /></td>
                  <td><button className="btn ghost sm" onClick={() => setSelected(g.id)}>Open →</button></td>
                </tr>
              ))}
              {state.groups.length === 0 && <tr><td colSpan={7} className="empty" style={{ padding: 18 }}>No groups yet — add the first one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function PhaseTrack({ current, dropped }: { current: number; dropped?: boolean }) {
  return (
    <span className="flex" style={{ gap: 4 }}>
      {[1, 2, 3].map((n) => (
        <span key={n} title={PHASES[n - 1].title} style={{ width: 22, height: 6, borderRadius: 3, background: dropped ? '#e3e8f4' : n <= current ? PHASES[current - 1].accent : '#e3e8f4', opacity: dropped ? 0.6 : 1 }} />
      ))}
      <span className="mono muted" style={{ fontSize: 11, marginLeft: 4 }}>{dropped ? '—' : `P${current}`}</span>
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: GroupOutcome }) {
  const m = OUTCOME_META[outcome]
  return <span className="pill" style={{ borderColor: m.color, color: m.color }} title={m.hint}>{m.label}</span>
}

// ---------- group detail ----------
function GroupDetail({ group, ll, onBack }: { group: LitGroup; ll: ReturnType<typeof useLitLink>; onBack: () => void }) {
  const [newMember, setNewMember] = useState('')
  const g = group
  const set = (patch: Partial<LitGroup>) => ll.patchGroup(g.id, patch)

  return (
    <>
      <div className="page-head">
        <Rule />
        <button className="btn ghost sm" style={{ marginBottom: 10 }} onClick={onBack}>← All groups</button>
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Kicker>LITLINK · GROUP</Kicker>
            <input className="input" style={{ fontSize: 24, fontWeight: 800, marginTop: 8, width: '100%', maxWidth: 560 }} value={g.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="row-actions" style={{ flex: 'none', alignItems: 'center', gap: 8 }}>
            <OutcomeBadge outcome={g.outcome} />
            <button className="btn ghost sm danger" onClick={() => { if (confirm(`Remove ${g.name}?`)) { ll.removeGroup(g.id); onBack() } }}>Delete</button>
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card lg">
          <div className="card-h"><span className="sq" style={{ background: 'var(--blue)' }} />TOPIC &amp; SCOPE</div>
          <label className="fld"><span className="fld-l">Foundational area</span><input className="input" value={g.foundationArea ?? ''} onChange={(e) => set({ foundationArea: e.target.value })} placeholder="the broader domain to ground in first" /></label>
          <label className="fld"><span className="fld-l">Specific topic</span><input className="input" value={g.topic ?? ''} onChange={(e) => set({ topic: e.target.value })} placeholder="the focused review topic" /></label>
          <div className="grid g2">
            <label className="fld"><span className="fld-l">Mentor</span><input className="input" value={g.mentor ?? ''} onChange={(e) => set({ mentor: e.target.value })} placeholder="advice · feedback · lit-review support" /></label>
            <label className="fld"><span className="fld-l">ACAD</span><input className="input" value={g.acad ?? ''} onChange={(e) => set({ acad: e.target.value })} placeholder="liaison · scheduling" /></label>
          </div>
        </div>
        <div className="card lg">
          <div className="card-h" style={{ justifyContent: 'space-between' }}><span><span className="sq" style={{ background: 'var(--violet)' }} />น้อง · {g.members.length}</span></div>
          {g.members.map((m) => (
            <div className="flex" key={m.id} style={{ gap: 8, marginBottom: 6 }}>
              <input className="input" style={{ flex: 1 }} value={m.name} onChange={(e) => ll.patchMember(g.id, m.id, { name: e.target.value })} />
              <input className="input" style={{ width: 90 }} value={m.role ?? ''} placeholder="year" onChange={(e) => ll.patchMember(g.id, m.id, { role: e.target.value })} />
              <button className="icon-btn danger" onClick={() => ll.removeMember(g.id, m.id)}>✕</button>
            </div>
          ))}
          <div className="flex" style={{ gap: 8, marginTop: 8 }}>
            <input className="input" style={{ flex: 1 }} value={newMember} placeholder="add น้อง…" onChange={(e) => setNewMember(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newMember.trim()) { ll.addMember(g.id, newMember.trim()); setNewMember('') } }} />
            <button className="btn ghost sm" disabled={!newMember.trim()} onClick={() => { ll.addMember(g.id, newMember.trim()); setNewMember('') }}>＋ Add</button>
          </div>
          {g.members.length > 4 && <p className="small" style={{ color: 'var(--amber)', marginTop: 6 }}>Groups are meant to be 3–4 น้อง.</p>}
        </div>
      </div>

      {/* phases */}
      {PHASES.map((p, i) => {
        const prog = g.phases[i]
        const isCurrent = g.currentPhase === i + 1 && g.outcome !== 'dropped'
        return (
          <div className="card lg" key={p.key} style={{ marginBottom: 16, borderLeft: `4px solid ${p.accent}`, opacity: g.outcome === 'dropped' ? 0.7 : 1 }}>
            <div className="card-h" style={{ justifyContent: 'space-between' }}>
              <span><span className="sq" style={{ background: p.accent }} />PHASE {p.n} · {p.title.toUpperCase()} <span className="mono muted" style={{ fontWeight: 400 }}>· {p.thai}</span></span>
              <span className="flex" style={{ gap: 8, alignItems: 'center' }}>
                {isCurrent && <span className="pill" style={{ borderColor: p.accent, color: p.accent }}>current</span>}
                <span className="seg">
                  {(['not-started', 'active', 'done'] as PhaseStatus[]).map((st) => (
                    <button key={st} className={`seg-b${prog.status === st ? ' on' : ''}`} onClick={() => ll.patchPhase(g.id, i, { status: st })}>{STATUS_LABEL[st]}</button>
                  ))}
                </span>
              </span>
            </div>
            <div className="grid g2">
              <div>
                <p className="small">{p.goal}</p>
                <p className="small"><b>Expected deliverable:</b> {p.deliverable}</p>
                <div className="divider" />
                <p className="small"><b>Mentor:</b> {p.mentor}</p>
                <p className="small"><b>ACAD:</b> {p.acad}</p>
              </div>
              <div>
                <label className="fld"><span className="fld-l">Group's deliverable / output</span><input className="input" value={prog.deliverable ?? ''} onChange={(e) => ll.patchPhase(g.id, i, { deliverable: e.target.value })} placeholder="what the group produced" /></label>
                <label className="fld"><span className="fld-l">Working notes / lit log</span><textarea className="textarea" rows={2} value={prog.notes ?? ''} onChange={(e) => ll.patchPhase(g.id, i, { notes: e.target.value })} /></label>
                <label className="fld"><span className="fld-l" style={{ color: p.accent }}>Mentor feedback</span><textarea className="textarea" rows={2} value={prog.mentorFeedback ?? ''} onChange={(e) => ll.patchPhase(g.id, i, { mentorFeedback: e.target.value })} /></label>
              </div>
            </div>
            {isCurrent && i < 2 && <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => ll.advance(g.id)}>Mark done &amp; advance to Phase {p.n + 1} →</button>}
          </div>
        )
      })}

      {/* outcome */}
      <div className="card lg" style={{ borderLeft: '4px solid var(--green)' }}>
        <div className="card-h"><span className="sq" style={{ background: 'var(--green)' }} />OUTCOME · the endpoint is flexible</div>
        <div className="seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          {(Object.keys(OUTCOME_META) as GroupOutcome[]).map((o) => (
            <button key={o} className={`seg-b${g.outcome === o ? ' on' : ''}`} onClick={() => set({ outcome: o })}>{OUTCOME_META[o].label}</button>
          ))}
        </div>
        {g.outcome === 'research-question' && (
          <label className="fld"><span className="fld-l">Research Question <span className="muted">— a question current knowledge can't yet answer</span></span><textarea className="textarea" rows={3} value={g.researchQuestion ?? ''} onChange={(e) => set({ researchQuestion: e.target.value })} placeholder="State the group's research question." /></label>
        )}
        {g.outcome === 'reflection' && (
          <label className="fld"><span className="fld-l">Reflection <span className="muted">— process, what you enjoyed, advice you'd want</span></span><textarea className="textarea" rows={4} value={g.reflection ?? ''} onChange={(e) => set({ reflection: e.target.value })} placeholder="Reflect on the research process, your interest in the topic, and the guidance you'd want for future research." /></label>
        )}
        {g.outcome === 'dropped' && (
          <label className="fld"><span className="fld-l">Note <span className="muted">— stepping out is supported, no penalty</span></span><textarea className="textarea" rows={2} value={g.dropReason ?? ''} onChange={(e) => set({ dropReason: e.target.value })} placeholder="Optional: what got in the way, so the mentor can help." /></label>
        )}
        {g.outcome === 'in-progress' && <p className="small muted">Choose an endpoint when the group is ready — a Research Question, a Reflection, or a supported step-out. None is a failure.</p>}
      </div>
    </>
  )
}
