// Rigor audit trail + score trend, per project, in localStorage. This is a
// monitoring log (not part of the project export), so it lives outside the store.

export interface AuditEntry {
  ts: number
  findingId: string
  label: string
  action: string // 'resolved' | 'acknowledged' | 'reopened'
  note?: string
}

export interface TrendPoint {
  day: string // YYYY-MM-DD
  score: number
  ts: number
}

const aKey = (pid: string) => `williamslab.rigor.audit.${pid}`
const tKey = (pid: string) => `williamslab.rigor.trend.${pid}`

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[]
  } catch {
    return []
  }
}
function write(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* ignore quota */
  }
}

export function getAudit(pid: string): AuditEntry[] {
  return read<AuditEntry>(aKey(pid))
}
export function appendAudit(pid: string, e: AuditEntry) {
  const list = getAudit(pid)
  list.unshift(e)
  write(aKey(pid), list.slice(0, 80))
}

export function getTrend(pid: string): TrendPoint[] {
  return read<TrendPoint>(tKey(pid))
}

// Record today's score (one point per day; updates the day's latest value).
export function recordScore(pid: string, score: number, now: number): TrendPoint[] {
  const list = getTrend(pid)
  const day = new Date(now).toISOString().slice(0, 10)
  const last = list[list.length - 1]
  if (last && last.day === day) {
    last.score = score
    last.ts = now
  } else {
    list.push({ day, score, ts: now })
  }
  const trimmed = list.slice(-60)
  write(tKey(pid), trimmed)
  return trimmed
}
