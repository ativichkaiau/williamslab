// Reference library — unifies the graph's Papers and the review's included
// Studies into one citeable set (merged by PMID/DOI), assigns stable citation
// keys, and exports BibTeX / RIS plus a numbered Vancouver-style list for the
// manuscript.
import type { ProjectState } from '../types'
import { normDoi } from './sources'

export interface Reference {
  id: string
  kind: 'paper' | 'study' | 'both'
  citeKey: string
  author?: string // first-author surname (co-authors abbreviated to "et al.")
  title: string
  year?: number
  journal?: string
  pmid?: string
  doi?: string
  inGraph: boolean
  inStudies: boolean
}

// pull a probable title / journal out of a study note like "Title — Journal · doi:…"
function parseNote(note?: string): { title?: string; journal?: string } {
  if (!note) return {}
  const head = note.split(' · ')[0]
  const [title, journal] = head.split(' — ')
  return { title: title?.trim() || undefined, journal: journal?.trim() || undefined }
}

// First author's surname: take the first author, drop trailing initials
// ("van den Boogaard M" → "van den Boogaard"), keeping name particles.
const surnameOf = (a?: string): string | undefined => {
  if (!a) return undefined
  const first = a.split(/[,;]/)[0].trim()
  const noInitials = first.replace(/(\s+[A-Z]{1,3}\.?)+$/, '').trim()
  return noInitials || first.split(/\s+/)[0] || undefined
}

interface Raw {
  kind: 'paper' | 'study'
  id: string
  author?: string
  title: string
  year?: number
  journal?: string
  pmid?: string
  doi?: string
}

const STOP = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'and', 'or', 'for', 'to', 'with', 'using', 'from', 'by', 'at', 'is', 'are', 'via'])
function makeKey(r: { author?: string; title: string; year?: number }): string {
  const sn = surnameOf(r.author)?.split(/\s+/).pop() // core surname word for the key
  const titleWord = r.title.replace(/[^A-Za-z ]+/g, ' ').trim().split(/\s+/).find((w) => w.length >= 3 && !STOP.has(w.toLowerCase()))
  const base = (sn || titleWord || r.title.replace(/[^A-Za-z]+/g, '').slice(0, 6) || 'ref').replace(/[^A-Za-z]/g, '').toLowerCase()
  return `${base}${r.year ?? ''}`
}

// Collect + merge Papers and Studies into a de-duplicated, cite-keyed library.
export function collectReferences(state: ProjectState): Reference[] {
  const raws: Raw[] = []
  for (const p of state.papers) {
    raws.push({ kind: 'paper', id: p.id, author: p.authors, title: p.title, year: p.year, journal: p.journal, pmid: p.pmid, doi: p.doi })
  }
  for (const s of state.review.studies) {
    const { title, journal } = parseNote(s.note)
    raws.push({ kind: 'study', id: s.id, author: s.author, title: title ?? '', year: s.year, journal, pmid: s.pmid })
  }

  const merged: Reference[] = []
  for (const raw of raws) {
    const match = merged.find((m) =>
      (raw.pmid && m.pmid === raw.pmid) || (raw.doi && normDoi(m.doi) && normDoi(m.doi) === normDoi(raw.doi)),
    )
    if (match) {
      match.kind = match.kind === raw.kind ? match.kind : 'both'
      match.author = match.author || surnameOf(raw.author)
      if (raw.title.length > match.title.length) match.title = raw.title
      match.year = match.year ?? raw.year
      match.journal = match.journal || raw.journal
      match.pmid = match.pmid || raw.pmid
      match.doi = match.doi || raw.doi
      match.inGraph = match.inGraph || raw.kind === 'paper'
      match.inStudies = match.inStudies || raw.kind === 'study'
    } else {
      merged.push({
        id: raw.id, kind: raw.kind, citeKey: '', author: surnameOf(raw.author), title: raw.title,
        year: raw.year, journal: raw.journal, pmid: raw.pmid, doi: raw.doi,
        inGraph: raw.kind === 'paper', inStudies: raw.kind === 'study',
      })
    }
  }

  // stable order: year desc, then title; assign unique cite keys with a/b/c suffixes
  merged.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title))
  const seen: Record<string, number> = {}
  for (const ref of merged) {
    const base = makeKey(ref)
    const n = seen[base] ?? 0
    seen[base] = n + 1
    ref.citeKey = n === 0 ? base : `${base}${String.fromCharCode(97 + n)}`
  }
  return merged
}

const bibField = (k: string, v?: string | number) => (v || v === 0 ? `  ${k} = {${v}},\n` : '')

export function toBibtex(refs: Reference[]): string {
  return refs
    .map((r) => {
      const type = r.journal ? 'article' : 'misc'
      const author = r.author ? `${r.author} and others` : ''
      return (
        `@${type}{${r.citeKey},\n` +
        bibField('author', author) +
        bibField('title', r.title.trim() || `${r.author ?? 'Study'} ${r.year ?? ''}`.trim()) +
        bibField('journal', r.journal) +
        bibField('year', r.year) +
        bibField('pmid', r.pmid) +
        bibField('doi', r.doi ? normDoi(r.doi) : '') +
        `}`
      )
    })
    .join('\n\n')
}

export function toRis(refs: Reference[]): string {
  return refs
    .map((r) => {
      const lines = [`TY  - ${r.journal ? 'JOUR' : 'GEN'}`]
      if (r.author) lines.push(`AU  - ${r.author} et al.`)
      lines.push(`TI  - ${r.title.trim() || `${r.author ?? 'Study'} ${r.year ?? ''}`.trim()}`)
      if (r.journal) lines.push(`JO  - ${r.journal}`)
      if (r.year) lines.push(`PY  - ${r.year}`)
      if (r.doi) lines.push(`DO  - ${normDoi(r.doi)}`)
      if (r.pmid) lines.push(`AN  - PMID:${r.pmid}`)
      lines.push('ER  - ')
      return lines.join('\n')
    })
    .join('\n\n')
}

// A single numbered Vancouver-ish reference line.
export function vancouver(r: Reference, n: number): string {
  const bits = [
    r.author ? `${r.author} et al.` : null,
    r.title.trim() ? r.title.replace(/\.$/, '') + '.' : null,
    r.journal || null,
    r.year ? `${r.year}.` : null,
    r.pmid ? `PMID: ${r.pmid}.` : null,
    r.doi ? `doi:${normDoi(r.doi)}.` : null,
  ].filter(Boolean)
  return `${n}. ${bits.join(' ')}`
}

// The full numbered reference list as markdown — appended to the manuscript.
export function referenceListMd(refs: Reference[]): string {
  if (!refs.length) return ''
  return refs.map((r, i) => vancouver(r, i + 1)).join('\n\n')
}
