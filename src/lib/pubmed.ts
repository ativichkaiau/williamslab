// ============================================================
// PubMed E-utilities client — runs straight from the browser.
// NCBI sends `access-control-allow-origin: *`, so no backend
// proxy is needed in v1. esearch → PMIDs, esummary → metadata.
// Unauthenticated limit is 3 req/s; each search is 2 requests.
// ============================================================

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

export interface PubmedHit {
  pmid: string
  title: string
  year?: number
  journal?: string
  authors?: string
  doi?: string
}

interface SummaryAuthor { name?: string }
interface SummaryArticleId { idtype?: string; value?: string }
interface SummaryRecord {
  title?: string
  pubdate?: string
  source?: string
  fulljournalname?: string
  authors?: SummaryAuthor[]
  articleids?: SummaryArticleId[]
}

export async function searchPubmed(term: string, retmax = 15, sort: 'relevance' | 'date' = 'relevance'): Promise<PubmedHit[]> {
  const q = term.trim()
  if (!q) return []

  const esUrl = `${BASE}/esearch.fcgi?db=pubmed&retmode=json&sort=${sort === 'date' ? 'pub_date' : 'relevance'}&retmax=${retmax}&term=${encodeURIComponent(q)}`
  const esRes = await fetch(esUrl)
  if (!esRes.ok) throw new Error(`PubMed search failed (${esRes.status})`)
  const esJson = await esRes.json()
  const ids: string[] = esJson?.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const suUrl = `${BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`
  const suRes = await fetch(suUrl)
  if (!suRes.ok) throw new Error(`PubMed summary failed (${suRes.status})`)
  const suJson = await suRes.json()
  const result: Record<string, SummaryRecord> & { uids?: string[] } = suJson?.result ?? {}

  return (result.uids ?? ids).map((id): PubmedHit => {
    const r = result[id] ?? {}
    const doi = (r.articleids ?? []).find((a) => a.idtype === 'doi')?.value
    const names = (r.authors ?? []).map((a) => a.name).filter(Boolean) as string[]
    const authors = names.length > 3 ? `${names.slice(0, 3).join(', ')} et al.` : names.join(', ')
    const yearMatch = /(\d{4})/.exec(r.pubdate ?? '')
    return {
      pmid: id,
      title: r.title?.replace(/\.$/, '') ?? '(untitled)',
      year: yearMatch ? Number(yearMatch[1]) : undefined,
      journal: r.source ?? r.fulljournalname,
      authors,
      doi,
    }
  })
}

// Fetch metadata for an explicit list of PMIDs (esummary) — used by screening.
export async function fetchByPmids(pmids: string[]): Promise<PubmedHit[]> {
  const ids = [...new Set(pmids.map((p) => p.trim()).filter((p) => /^\d+$/.test(p)))]
  if (ids.length === 0) return []
  const res = await fetch(`${BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`)
  if (!res.ok) throw new Error(`PubMed summary failed (${res.status})`)
  const json = await res.json()
  const result: Record<string, SummaryRecord> & { uids?: string[] } = json?.result ?? {}
  return (result.uids ?? ids).map((id): PubmedHit => {
    const r = result[id] ?? {}
    const doi = (r.articleids ?? []).find((a) => a.idtype === 'doi')?.value
    const names = (r.authors ?? []).map((a) => a.name).filter(Boolean) as string[]
    const authors = names.length > 3 ? `${names.slice(0, 3).join(', ')} et al.` : names.join(', ')
    const yearMatch = /(\d{4})/.exec(r.pubdate ?? '')
    return { pmid: id, title: r.title?.replace(/\.$/, '') ?? '(untitled)', year: yearMatch ? Number(yearMatch[1]) : undefined, journal: r.source ?? r.fulljournalname, authors, doi }
  })
}

// Fetch a single abstract (efetch plain text) for on-demand screening.
export async function fetchAbstract(pmid: string): Promise<string> {
  const res = await fetch(`${BASE}/efetch.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&rettype=abstract&retmode=text`)
  if (!res.ok) throw new Error(`PubMed abstract failed (${res.status})`)
  const text = (await res.text()).trim()
  return text || 'No abstract available.'
}
