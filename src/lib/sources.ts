// ============================================================
// Multi-database literature search — Europe PMC, CrossRef and
// ClinicalTrials.gov beside PubMed. Every endpoint sends
// `access-control-allow-origin: *`, so all of this runs straight
// from the browser with no proxy. Results are normalised to one
// shape and fuzzy-deduplicated across sources.
// ============================================================
import { searchPubmed } from './pubmed'

export type SourceName = 'PubMed' | 'Europe PMC' | 'CrossRef' | 'ClinicalTrials.gov'
export const ALL_SOURCES: SourceName[] = ['PubMed', 'Europe PMC', 'CrossRef', 'ClinicalTrials.gov']

export interface SourceHit {
  key: string
  title: string
  year?: number
  journal?: string
  authors?: string
  doi?: string
  pmid?: string
  nctId?: string
  url?: string
  sources: SourceName[]
}

const fmtAuthors = (names: string[]): string => {
  const clean = names.map((n) => n.trim()).filter(Boolean)
  return clean.length > 3 ? `${clean.slice(0, 3).join(', ')} et al.` : clean.join(', ')
}
const yearFrom = (s: string | number | undefined): number | undefined => {
  const m = /(\d{4})/.exec(String(s ?? ''))
  return m ? Number(m[1]) : undefined
}
export const normDoi = (d?: string): string => (d ? d.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/\s+/g, '').trim() : '')
const normTitle = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const titleTokens = (t: string): Set<string> => new Set(normTitle(t).split(' ').filter((w) => w.length > 2))
function jaccard(a: string, b: string): number {
  const A = titleTokens(a), B = titleTokens(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

// Are two records the same work? DOI/PMID are authoritative; otherwise fall
// back to near-identical titles within a year of each other.
export function samePaper(x: SourceHit, y: SourceHit): boolean {
  const dx = normDoi(x.doi), dy = normDoi(y.doi)
  if (dx && dy) return dx === dy
  if (x.pmid && y.pmid) return x.pmid === y.pmid
  if (x.nctId && y.nctId) return x.nctId === y.nctId
  const nt = normTitle(x.title)
  if (nt && nt === normTitle(y.title)) return true
  const yd = x.year && y.year ? Math.abs(x.year - y.year) : 0
  return jaccard(x.title, y.title) >= 0.85 && yd <= 1
}

function mergeInto(base: SourceHit, extra: SourceHit): SourceHit {
  return {
    ...base,
    title: base.title.length >= extra.title.length ? base.title : extra.title,
    year: base.year ?? extra.year,
    journal: base.journal || extra.journal,
    authors: base.authors || extra.authors,
    doi: base.doi || extra.doi,
    pmid: base.pmid || extra.pmid,
    nctId: base.nctId || extra.nctId,
    url: base.url || extra.url,
    sources: [...new Set([...base.sources, ...extra.sources])],
  }
}

// Fuzzy de-duplication: collapse the same work across sources into one record
// that carries every source tag and the richest metadata.
export function dedupeHits(hits: SourceHit[]): SourceHit[] {
  const groups: SourceHit[] = []
  for (const h of hits) {
    const g = groups.find((x) => samePaper(x, h))
    if (g) Object.assign(g, mergeInto(g, h))
    else groups.push({ ...h })
  }
  return groups
}

// ---- Europe PMC ----
export async function searchEuropePmc(term: string, retmax = 20): Promise<SourceHit[]> {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(term)}&format=json&pageSize=${retmax}&resultType=lite`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Europe PMC failed (${res.status})`)
  const json = await res.json()
  const list: Record<string, unknown>[] = json?.resultList?.result ?? []
  return list.map((r): SourceHit => {
    const pmid = typeof r.pmid === 'string' ? r.pmid : undefined
    const doi = typeof r.doi === 'string' ? r.doi : undefined
    return {
      key: `epmc:${r.id ?? doi ?? Math.random()}`,
      title: String(r.title ?? '(untitled)').replace(/\.$/, ''),
      year: yearFrom(r.pubYear as string),
      journal: (r.journalTitle as string) || undefined,
      authors: (r.authorString as string)?.replace(/\.$/, '') || undefined,
      doi,
      pmid,
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : doi ? `https://doi.org/${doi}` : undefined,
      sources: ['Europe PMC'],
    }
  })
}

// ---- CrossRef ----
interface CrossrefItem {
  DOI?: string
  title?: string[]
  author?: { given?: string; family?: string }[]
  'container-title'?: string[]
  issued?: { 'date-parts'?: number[][] }
}
function crossrefToHit(it: CrossrefItem, keyPrefix: string): SourceHit | null {
  const title = it.title?.[0]
  if (!title) return null
  const names = (it.author ?? []).map((a) => [a.family, a.given?.replace(/\B\w+/g, '').replace(/\W/g, '')].filter(Boolean).join(' ')).filter(Boolean)
  const doi = it.DOI
  return {
    key: `${keyPrefix}:${doi ?? title.slice(0, 24)}`,
    title: title.replace(/\.$/, ''),
    year: it.issued?.['date-parts']?.[0]?.[0],
    journal: it['container-title']?.[0],
    authors: fmtAuthors(names),
    doi,
    url: doi ? `https://doi.org/${doi}` : undefined,
    sources: ['CrossRef'],
  }
}
export async function searchCrossref(term: string, retmax = 20): Promise<SourceHit[]> {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(term)}&rows=${retmax}&select=DOI,title,author,container-title,issued`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CrossRef failed (${res.status})`)
  const json = await res.json()
  const items: CrossrefItem[] = json?.message?.items ?? []
  return items.map((it) => crossrefToHit(it, 'crossref')).filter((h): h is SourceHit => !!h)
}

// DOI paste → CrossRef auto-fill (a single work).
export async function crossrefByDoi(doi: string): Promise<SourceHit | null> {
  const clean = normDoi(doi).replace(/^doi:/, '')
  if (!/^10\.\S+\/\S+/.test(clean)) throw new Error('That does not look like a DOI (expected 10.xxxx/…).')
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(clean)}`)
  if (res.status === 404) throw new Error('No CrossRef record for that DOI.')
  if (!res.ok) throw new Error(`CrossRef failed (${res.status})`)
  const json = await res.json()
  return json?.message ? crossrefToHit(json.message as CrossrefItem, 'doi') : null
}

// ---- ClinicalTrials.gov (API v2) ----
export async function searchTrials(term: string, retmax = 20): Promise<SourceHit[]> {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(term)}&pageSize=${retmax}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ClinicalTrials.gov failed (${res.status})`)
  const json = await res.json()
  const studies: { protocolSection?: Record<string, Record<string, unknown>> }[] = json?.studies ?? []
  return studies.map((s): SourceHit | null => {
    const p = s.protocolSection ?? {}
    const nctId = (p.identificationModule?.nctId as string) || undefined
    const title = (p.identificationModule?.briefTitle as string) || undefined
    if (!title) return null
    const status = (p.statusModule?.overallStatus as string) || ''
    const start = (p.statusModule?.startDateStruct as { date?: string })?.date
    return {
      key: `nct:${nctId}`,
      title,
      year: yearFrom(start),
      journal: `Clinical trial${status ? ` · ${status.toLowerCase().replace(/_/g, ' ')}` : ''}`,
      nctId,
      url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : undefined,
      sources: ['ClinicalTrials.gov'],
    }
  }).filter((h): h is SourceHit => !!h)
}

async function searchPubmedAsSource(term: string, retmax: number): Promise<SourceHit[]> {
  const hits = await searchPubmed(term, retmax)
  return hits.map((h): SourceHit => ({
    key: `pubmed:${h.pmid}`,
    title: h.title,
    year: h.year,
    journal: h.journal,
    authors: h.authors,
    doi: h.doi,
    pmid: h.pmid,
    url: `https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`,
    sources: ['PubMed'],
  }))
}

const RUNNERS: Record<SourceName, (t: string, n: number) => Promise<SourceHit[]>> = {
  PubMed: searchPubmedAsSource,
  'Europe PMC': searchEuropePmc,
  CrossRef: searchCrossref,
  'ClinicalTrials.gov': searchTrials,
}

export interface MultiSearchResult {
  hits: SourceHit[]
  errors: { source: SourceName; msg: string }[]
  rawCount: number // total hits before de-duplication
  perSource: Record<string, number>
}

// Run the selected sources in parallel, then fuzzy-dedupe the union.
export async function searchSources(term: string, sources: SourceName[], retmax = 20): Promise<MultiSearchResult> {
  const q = term.trim()
  if (!q || sources.length === 0) return { hits: [], errors: [], rawCount: 0, perSource: {} }
  const settled = await Promise.allSettled(sources.map((s) => RUNNERS[s](q, retmax)))
  const all: SourceHit[] = []
  const errors: { source: SourceName; msg: string }[] = []
  const perSource: Record<string, number> = {}
  settled.forEach((r, i) => {
    const src = sources[i]
    if (r.status === 'fulfilled') {
      perSource[src] = r.value.length
      all.push(...r.value)
    } else {
      errors.push({ source: src, msg: r.reason instanceof Error ? r.reason.message : 'request failed' })
    }
  })
  const deduped = dedupeHits(all).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  return { hits: deduped, errors, rawCount: all.length, perSource }
}
