// LitLink — a mentored literature-review program that sits alongside the
// research tooling. Groups of 3–4 น้อง, each with a Mentor + an ACAD, move
// through three phases; the endpoint is flexible (a Research Question, a
// Reflection, or a supported drop-out). Program-level data, its own
// localStorage key (independent of the per-project research store).
import { useCallback, useState } from 'react'

export type PhaseStatus = 'not-started' | 'active' | 'done'
export type GroupOutcome = 'in-progress' | 'research-question' | 'reflection' | 'dropped'

export interface LitMember {
  id: string
  name: string
  role?: string // free text, e.g. year / faculty
}
export interface PhaseProgress {
  status: PhaseStatus
  deliverable?: string // the phase output
  notes?: string // the group's own working notes / lit log
  mentorFeedback?: string
}
export interface LitGroup {
  id: string
  name: string
  topic?: string // the specific topic under review
  foundationArea?: string // the broader domain the foundation covers
  members: LitMember[]
  mentor?: string
  acad?: string
  currentPhase: number // 1..3
  phases: PhaseProgress[] // length 3
  outcome: GroupOutcome
  researchQuestion?: string
  reflection?: string
  dropReason?: string
  promotedProjectId?: string // set when the group's RQ was promoted to a review project
}
export interface LitLinkState {
  cohort: string
  groups: LitGroup[]
}

// The three phases — with each side's duties baked in, so the tab is
// self-documenting for both Mentors and ACADs.
export interface PhaseDef {
  n: number
  key: string
  title: string
  thai: string
  goal: string
  deliverable: string
  mentor: string
  acad: string
  accent: string
}
export const PHASES: PhaseDef[] = [
  {
    n: 1,
    key: 'foundations',
    title: 'Foundations',
    thai: 'พื้นฐาน',
    goal: 'Build core background knowledge in the domain BEFORE the specific topic — so juniors are flexible with professors, strengthen their coursework, and learn to ask good questions (a Research Question = one current knowledge can’t yet answer).',
    deliverable: 'A foundational summary or concept map of the domain.',
    mentor: 'Point to key textbooks & landmark reviews; check understanding; correct misconceptions early.',
    acad: 'Match the group, set the schedule, and connect them to the research side.',
    accent: '#1746d1',
  },
  {
    n: 2,
    key: 'review',
    title: 'Focused review',
    thai: 'ทบทวนวรรณกรรมเฉพาะ',
    goal: 'A focused literature review on the specific topic, building on the foundation just laid.',
    deliverable: 'Annotated key papers + a short synthesis of what is (and isn’t) known.',
    mentor: 'Suggest a search strategy & key papers; give feedback on the synthesis.',
    acad: 'Facilitate meetings, keep momentum, and may join the lit-review process.',
    accent: '#0d9488',
  },
  {
    n: 3,
    key: 'synthesis',
    title: 'Synthesis',
    thai: 'สังเคราะห์',
    goal: 'Arrive at a Research Question (a gap current knowledge can’t answer) — OR, if that isn’t reachable, pivot to a Reflection. Neither is a failure.',
    deliverable: 'A Research Question, or a Reflection (the group’s research process, what they enjoyed, advice they’d want).',
    mentor: 'Judge whether the RQ is answerable & novel; support a compassionate drop-out if truly needed.',
    acad: 'Relay the output to the research side and arrange the presentation / feedback.',
    accent: '#7c3aed',
  },
]

export const OUTCOME_META: Record<GroupOutcome, { label: string; color: string; hint: string }> = {
  'in-progress': { label: 'In progress', color: '#5b6480', hint: 'Working through the phases.' },
  'research-question': { label: 'Research Question', color: '#12b981', hint: 'Reached a novel, answerable question.' },
  reflection: { label: 'Reflection', color: '#1746d1', hint: 'Pivoted to a reflection on the process — a valid outcome.' },
  dropped: { label: 'Dropped (supported)', color: '#f59e0b', hint: 'Stepped out with mentor support — no penalty.' },
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`
const blankPhases = (): PhaseProgress[] => [{ status: 'active' }, { status: 'not-started' }, { status: 'not-started' }]

export function newGroup(name: string): LitGroup {
  return { id: uid('grp'), name, members: [], currentPhase: 1, phases: blankPhases(), outcome: 'in-progress' }
}

const STORAGE_KEY = 'williamslab.litlink'

const SEED: LitLinkState = {
  cohort: 'LitLink 2026 · Cohort 1',
  groups: [
    {
      id: 'grp_seed_a', name: 'Group 1 · Cardio-Epigenetics', topic: 'DNA methylation of cardiac ion-channel genes', foundationArea: 'Cardiac electrophysiology & gene regulation',
      members: [{ id: 'm1', name: 'น้อง A', role: 'Y2' }, { id: 'm2', name: 'น้อง B', role: 'Y2' }, { id: 'm3', name: 'น้อง C', role: 'Y1' }],
      mentor: 'Dr. Mentor (EP lab)', acad: 'ACAD · Ravindran', currentPhase: 3,
      phases: [
        { status: 'done', deliverable: 'Concept map: action potential → I_Na → conduction', notes: 'Covered cardiac AP, Nav1.5, and the basics of epigenetic regulation.', mentorFeedback: 'Solid grasp of the AP — ready for the specific topic.' },
        { status: 'done', deliverable: '8 key papers annotated; synthesis drafted', notes: 'Focused on SCN5A promoter methylation in Brugada.', mentorFeedback: 'Good coverage; note the small sample sizes.' },
        { status: 'active', deliverable: '', notes: 'Debating whether the RQ is answerable with available tissue.' },
      ],
      outcome: 'research-question',
      researchQuestion: 'Does promoter DNA methylation of SCN5A independently predict arrhythmic risk beyond coding mutation status in Brugada syndrome?',
    },
    {
      id: 'grp_seed_b', name: 'Group 2 · Microbiome & Immunity', topic: 'Gut microbiome and autoimmune modulation', foundationArea: 'Immunology & host–microbe interaction',
      members: [{ id: 'm4', name: 'น้อง D', role: 'Y2' }, { id: 'm5', name: 'น้อง E', role: 'Y2' }, { id: 'm6', name: 'น้อง F', role: 'Y2' }, { id: 'm7', name: 'น้อง G', role: 'Y1' }],
      mentor: 'Dr. Mentor (Immunology)', acad: 'ACAD · Suphon', currentPhase: 2,
      phases: [
        { status: 'done', deliverable: 'Foundations note on innate vs adaptive immunity', notes: 'Built up from the immunology block.', mentorFeedback: 'Clear — move to the specific literature.' },
        { status: 'active', deliverable: '', notes: 'Screening reviews on SCFA and Treg induction.' },
        { status: 'not-started' },
      ],
      outcome: 'in-progress',
    },
    {
      id: 'grp_seed_c', name: 'Group 3 · AI in ECG', topic: 'Deep learning for ECG interpretation', foundationArea: 'Cardiology basics + ML fundamentals',
      members: [{ id: 'm8', name: 'น้อง H', role: 'Y1' }, { id: 'm9', name: 'น้อง I', role: 'Y1' }, { id: 'm10', name: 'น้อง J', role: 'Y1' }],
      mentor: 'Dr. Mentor (Cardiology)', acad: 'ACAD · Ravindran', currentPhase: 1,
      phases: [
        { status: 'active', deliverable: '', notes: 'Learning ECG lead systems and what a CNN actually does.' },
        { status: 'not-started' },
        { status: 'not-started' },
      ],
      outcome: 'in-progress',
    },
    {
      id: 'grp_seed_d', name: 'Group 4 · Sleep & Metabolism', topic: 'Sleep deprivation and insulin resistance', foundationArea: 'Endocrinology & sleep physiology',
      members: [{ id: 'm11', name: 'น้อง K', role: 'Y2' }, { id: 'm12', name: 'น้อง L', role: 'Y2' }],
      mentor: 'Dr. Mentor (Endocrine)', acad: 'ACAD · Suphon', currentPhase: 2,
      phases: [
        { status: 'done', deliverable: 'Foundations: glucose homeostasis + sleep architecture', notes: 'Two members; one had clinical rotations clash.', mentorFeedback: 'Good start despite the schedule.' },
        { status: 'active', deliverable: '', notes: 'Struggling with time — considering a reflection instead of a full RQ.' },
        { status: 'not-started' },
      ],
      outcome: 'reflection',
      reflection: 'We found the topic fascinating but underestimated the time alongside clinical rotations. We most enjoyed learning to read primary papers critically, and would want a mentor to help scope a smaller question next time.',
    },
  ],
}

function load(): LitLinkState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LitLinkState
      if (parsed && Array.isArray(parsed.groups)) return parsed
    }
  } catch {
    /* fall through to seed */
  }
  return SEED
}

// Program-level store hook (independent of the research project store).
export function useLitLink() {
  const [state, setStateInner] = useState<LitLinkState>(load)
  // persist synchronously on every mutation — a plain useEffect would be
  // skipped if the page unmounts in the same tick (e.g. "promote" navigates
  // away to the new review project), dropping the write.
  const setState = useCallback((updater: LitLinkState | ((s: LitLinkState) => LitLinkState)) => {
    setStateInner((prev) => {
      const next = typeof updater === 'function' ? (updater as (s: LitLinkState) => LitLinkState)(prev) : updater
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore quota */
      }
      return next
    })
  }, [])

  const patchGroup = useCallback((id: string, patch: Partial<LitGroup>) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  }, [])
  const patchPhase = useCallback((id: string, phaseIdx: number, patch: Partial<PhaseProgress>) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, phases: g.phases.map((p, i) => (i === phaseIdx ? { ...p, ...patch } : p)) } : g)) }))
  }, [])
  const advance = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) => {
        if (g.id !== id || g.currentPhase >= 3) return g
        const phases = g.phases.map((p, i) => (i === g.currentPhase - 1 ? { ...p, status: 'done' as PhaseStatus } : i === g.currentPhase ? { ...p, status: 'active' as PhaseStatus } : p))
        return { ...g, phases, currentPhase: g.currentPhase + 1 }
      }),
    }))
  }, [])
  const addGroup = useCallback((name: string) => {
    const g = newGroup(name || `Group ${Math.floor(Math.random() * 900 + 100)}`)
    setState((s) => ({ ...s, groups: [...s.groups, g] }))
    return g.id
  }, [])
  const removeGroup = useCallback((id: string) => setState((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) })), [])
  const addMember = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, members: [...g.members, { id: uid('m'), name }] } : g)) }))
  }, [])
  const patchMember = useCallback((gid: string, mid: string, patch: Partial<LitMember>) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === gid ? { ...g, members: g.members.map((m) => (m.id === mid ? { ...m, ...patch } : m)) } : g)) }))
  }, [])
  const removeMember = useCallback((gid: string, mid: string) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === gid ? { ...g, members: g.members.filter((m) => m.id !== mid) } : g)) }))
  }, [])
  const setCohort = useCallback((cohort: string) => setState((s) => ({ ...s, cohort })), [])
  const resetSeed = useCallback(() => setState(SEED), [])

  return { state, patchGroup, patchPhase, advance, addGroup, removeGroup, addMember, patchMember, removeMember, setCohort, resetSeed }
}

export interface CohortStats {
  groups: number
  members: number
  byPhase: [number, number, number]
  outcomes: Record<GroupOutcome, number>
  completed: number // reached RQ or reflection
}
export function cohortStats(state: LitLinkState): CohortStats {
  const byPhase: [number, number, number] = [0, 0, 0]
  const outcomes: Record<GroupOutcome, number> = { 'in-progress': 0, 'research-question': 0, reflection: 0, dropped: 0 }
  let members = 0
  for (const g of state.groups) {
    members += g.members.length
    if (g.outcome === 'dropped') outcomes.dropped++
    else {
      byPhase[Math.min(2, Math.max(0, g.currentPhase - 1))]++
      outcomes[g.outcome]++
    }
  }
  return { groups: state.groups.length, members, byPhase, outcomes, completed: outcomes['research-question'] + outcomes.reflection }
}

// Mentor-facing cohort report (markdown): one section per group with roster,
// per-phase progress + feedback, and the final outcome (RQ / reflection / note).
export function exportCohortMd(state: LitLinkState): string {
  const s = cohortStats(state)
  const out: string[] = []
  out.push(`# ${state.cohort} — LitLink cohort report`)
  out.push('')
  out.push(`${s.groups} groups · ${s.members} น้อง · ${s.completed} reached an outcome (${s.outcomes['research-question']} research question, ${s.outcomes.reflection} reflection) · ${s.outcomes.dropped} supported step-out.`)
  out.push('')
  state.groups.forEach((g) => {
    const om = OUTCOME_META[g.outcome]
    out.push(`## ${g.name}`)
    out.push('')
    out.push(`- **Topic:** ${g.topic || '—'}${g.foundationArea ? ` (foundation: ${g.foundationArea})` : ''}`)
    out.push(`- **น้อง (${g.members.length}):** ${g.members.map((m) => `${m.name}${m.role ? ` (${m.role})` : ''}`).join(', ') || '—'}`)
    out.push(`- **Mentor:** ${g.mentor || '—'} · **ACAD:** ${g.acad || '—'}`)
    out.push(`- **Status:** Phase ${g.currentPhase}/3 · **Outcome:** ${om.label}`)
    out.push('')
    PHASES.forEach((p, i) => {
      const pr = g.phases[i]
      out.push(`**Phase ${p.n} · ${p.title}** — _${STATUS(pr.status)}_`)
      if (pr.deliverable) out.push(`  - Deliverable: ${pr.deliverable}`)
      if (pr.notes) out.push(`  - Notes: ${pr.notes}`)
      if (pr.mentorFeedback) out.push(`  - Mentor feedback: ${pr.mentorFeedback}`)
    })
    out.push('')
    if (g.outcome === 'research-question' && g.researchQuestion) out.push(`> **Research Question:** ${g.researchQuestion}`)
    if (g.outcome === 'reflection' && g.reflection) out.push(`> **Reflection:** ${g.reflection}`)
    if (g.outcome === 'dropped' && g.dropReason) out.push(`> **Step-out note:** ${g.dropReason}`)
    out.push('')
  })
  return out.join('\n')
}
const STATUS = (s: PhaseStatus) => (s === 'done' ? 'done' : s === 'active' ? 'in progress' : 'not started')
