import { isValidElement, type ReactNode } from 'react'
import { THEORY } from '../data/brsTheory'

// Lightweight retrieval over the BrS Theory reference so the Knowledge Review
// can ground and cite its answers. No embeddings/backend: we extract plaintext
// from each section's JSX once, then keyword-score against the query.

function extractText(node: ReactNode): string {
  if (node == null || node === false || node === true) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(' ')
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    return extractText(props?.children)
  }
  return ''
}

export interface TheoryChunk {
  id: string
  title: string
  group: string
  text: string
}

export const CHUNKS: TheoryChunk[] = THEORY.map((s) => ({
  id: s.id,
  title: s.title,
  group: s.group,
  text: extractText(s.body).replace(/\s+/g, ' ').trim(),
}))

const STOP = new Set(['the', 'and', 'for', 'are', 'with', 'that', 'this', 'from', 'what', 'how', 'why', 'does', 'can', 'you', 'your', 'about', 'into', 'over', 'per', 'via', 'has', 'have', 'was', 'were', 'a', 'an', 'of', 'in', 'on', 'to', 'is', 'it', 'or', 'vs', 'me'])

function terms(q: string): string[] {
  return [...new Set(q.toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter((t) => t.length > 2 && !STOP.has(t))
}

export interface Retrieved extends TheoryChunk {
  score: number
}

// Rank sections by keyword overlap; title hits weigh more than body hits.
export function retrieve(query: string, k = 3): Retrieved[] {
  const ts = terms(query)
  if (!ts.length) return []
  const scored = CHUNKS.map((c) => {
    const title = c.title.toLowerCase()
    const body = c.text.toLowerCase()
    let score = 0
    for (const t of ts) {
      if (title.includes(t)) score += 5
      // count body occurrences (capped so one term can't dominate)
      let idx = body.indexOf(t)
      let n = 0
      while (idx !== -1 && n < 6) {
        n++
        idx = body.indexOf(t, idx + t.length)
      }
      score += n
    }
    return { ...c, score }
  })
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

// Build a compact grounding block for the system prompt.
export function groundingBlock(chunks: Retrieved[], perChunk = 900): string {
  if (!chunks.length) return ''
  const body = chunks
    .map((c) => `### ${c.title}\n${c.text.slice(0, perChunk)}${c.text.length > perChunk ? '…' : ''}`)
    .join('\n\n')
  return `You have retrieved these excerpts from the WilliamsLab **BrS Theory** reference. Use them as your primary source. When you rely on one, cite it inline as [${chunks.map((c) => c.title).join('] / [')}] — i.e. the bracketed section title. If the excerpts don't cover the question, answer from general knowledge and say so.\n\n${body}`
}
