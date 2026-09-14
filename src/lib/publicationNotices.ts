import type { NoticeCheck, PublicationNotice } from '../types'
import { normalizeDoi, validDoi } from './evidence'

type CrossrefUpdate = { DOI?: string; type?: string; source?: string; label?: string; updated?: { 'date-parts'?: number[][] } }
type CrossrefWork = { DOI?: string; title?: string[]; 'update-to'?: CrossrefUpdate[] }

export function noticesFromWorks(doi: string, works: CrossrefWork[]): PublicationNotice[] {
  const found = new Map<string, PublicationNotice>()
  for (const work of works) {
    for (const update of work['update-to'] ?? []) {
      if (normalizeDoi(update.DOI) !== normalizeDoi(doi)) continue
      const notice: PublicationNotice = {
        doi: normalizeDoi(work.DOI) || undefined,
        title: work.title?.[0] || update.label || 'Publication update',
        type: update.type || 'update',
        source: update.source || 'publisher',
        date: update.updated?.['date-parts']?.[0]?.join('-'),
      }
      found.set(JSON.stringify(notice), notice)
    }
  }
  return [...found.values()]
}

// Crossref's updates filter returns notice records pointing TO the original DOI.
// https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/
export async function checkPublicationNotices(doi: string, signal?: AbortSignal): Promise<NoticeCheck> {
  const normalized = normalizeDoi(doi)
  if (!validDoi(normalized)) throw new Error('A valid DOI is required to check publication notices.')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 20000)
  try {
    const query = new URLSearchParams({ filter: `updates:${normalized}`, rows: '1000' })
    const res = await fetch(`https://api.crossref.org/works?${query}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`Crossref could not complete this check (${res.status}).`)
    const json = await res.json()
    if (!Array.isArray(json?.message?.items) || typeof json.message['total-results'] !== 'number') throw new Error('Crossref returned an unexpected response.')
    if (json.message['total-results'] > json.message.items.length) throw new Error('Crossref returned an incomplete result. Please check the publication directly.')
    return { doi: normalized, checkedAt: Date.now(), notices: noticesFromWorks(normalized, json.message.items) }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
