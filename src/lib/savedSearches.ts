// Saved PubMed searches with "new since last run" de-duplication.
// Kept in localStorage (search history is a tool preference, not project data).

export interface SavedSearch {
  id: string
  query: string
  lastRun: number
  seen: string[] // PMIDs seen on prior runs
}

const KEY = 'williamslab.radar.searches'
const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ')
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`)

export function listSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedSearch[]).sort((a, b) => b.lastRun - a.lastRun) : []
  } catch {
    return []
  }
}

function write(list: SavedSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function findSearch(query: string): SavedSearch | undefined {
  const n = norm(query)
  return listSearches().find((s) => norm(s.query) === n)
}

// Save (or re-baseline) a search: current PMIDs become the "seen" set.
export function saveSearch(query: string, pmids: string[], now: number): void {
  const list = listSearches().filter((s) => norm(s.query) !== norm(query))
  list.unshift({ id: newId(), query: query.trim(), lastRun: now, seen: [...new Set(pmids)].slice(-400) })
  write(list)
}

// Record a run against an EXISTING saved search: returns PMIDs new vs last run,
// then folds the current PMIDs in. Returns an empty set if the query isn't saved.
export function recordRun(query: string, pmids: string[], now: number): Set<string> {
  const list = listSearches()
  const ex = list.find((s) => norm(s.query) === norm(query))
  if (!ex) return new Set()
  const prev = new Set(ex.seen)
  const fresh = new Set(pmids.filter((p) => !prev.has(p)))
  ex.seen = [...new Set([...ex.seen, ...pmids])].slice(-400)
  ex.lastRun = now
  write(list)
  return fresh
}

export function removeSearch(id: string) {
  write(listSearches().filter((s) => s.id !== id))
}
