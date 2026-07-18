// Response-to-reviewers helper — split a pasted review report into individual
// points, assemble the point-by-point response letter, and build the grounded
// AI prompt context from the systematic review.
import type { ProjectState } from '../types'

export interface RevComment {
  id: string
  label: string
  comment: string
}

// Split a reviewer report into individual comments. Reviewer/editor header
// lines start a section (they aren't points themselves); within a section,
// points split on numbered markers ("1.", "2)", "Major"/"Minor") or blank lines.
export function parseComments(text: string): RevComment[] {
  const clean = text.replace(/\r/g, '').trim()
  if (!clean) return []
  const isHeader = (l: string) => /^\s*(?:reviewer|referee|editor)\s*\d*\s*[:.)-]?\s*$/i.test(l)
  const isMarker = (l: string) => /^\s*(?:\d+[.)]|major\b|minor\b|comment\s*\d*|Q\d+[:.)]|R\d+[:.)])/i.test(l)

  const chunks: { reviewer: string; text: string }[] = []
  let reviewer = ''
  let cur = ''
  const flush = () => { if (cur.trim()) chunks.push({ reviewer, text: cur.trim() }); cur = '' }
  for (const line of clean.split('\n')) {
    if (isHeader(line)) { flush(); reviewer = line.trim().replace(/[:.)-]\s*$/, ''); continue }
    if (isMarker(line)) { flush(); cur = line; continue }
    if (line.trim() === '') { flush(); continue }
    cur += (cur ? '\n' : '') + line
  }
  flush()

  let gid = 0
  const perRev: Record<string, number> = {}
  return chunks.map((ch) => {
    gid++
    const key = ch.reviewer || '_'
    perRev[key] = (perRev[key] ?? 0) + 1
    return { id: `c${gid}`, label: ch.reviewer ? `${ch.reviewer} · point ${perRev[key]}` : `Comment ${perRev[key]}`, comment: ch.text }
  })
}

// A compact, grounded description of what the review actually did — so drafted
// responses can cite real analyses instead of inventing them.
export function reviewContext(state: ProjectState, extra: { pooled?: string; certainty?: string; i2?: string } = {}): string {
  const r = state.review
  const analyses: string[] = ['PRISMA 2020 flow', `${r.model}-effects meta-analysis`, 'leave-one-out sensitivity analysis', 'subgroup analysis', 'Egger/Begg small-study tests', 'trim-and-fill', 'GRADE certainty rating']
  return [
    `Review question: ${r.question}`,
    `PICO — population: ${r.pico.p}; index: ${r.pico.i}; comparator: ${r.pico.c}; outcome: ${r.pico.o}`,
    `Included studies: ${r.prisma.included} (from ${r.prisma.dbRecords + r.prisma.otherRecords} records; ${r.databases.join(', ')})`,
    extra.pooled ? `Pooled estimate: ${extra.pooled}${extra.i2 ? `, I² ${extra.i2}` : ''}${extra.certainty ? `; GRADE ${extra.certainty}` : ''}` : '',
    `Analyses available: ${analyses.join(', ')}.`,
  ]
    .filter(Boolean)
    .join('\n')
}

// Assemble the full response letter (markdown) from comments + drafted replies.
export function buildLetter(opts: { title: string; comments: RevComment[]; responses: Record<string, string>; salutation?: string }): string {
  const { title, comments, responses } = opts
  const out: string[] = []
  out.push(`# Response to Reviewers`)
  out.push('')
  out.push(`**Manuscript:** ${title}`)
  out.push('')
  out.push(opts.salutation ?? 'We thank the reviewers for their careful and constructive assessment of our manuscript. We have addressed each comment point by point below; reviewer comments are in italics, our responses follow. All manuscript changes are highlighted in the revised submission.')
  out.push('')
  comments.forEach((c, i) => {
    out.push(`### ${c.label}`)
    out.push('')
    out.push(`> ${c.comment.replace(/\n/g, '\n> ')}`)
    out.push('')
    out.push(responses[c.id]?.trim() || '_[response pending]_')
    if (i < comments.length - 1) out.push('')
  })
  return out.join('\n')
}
