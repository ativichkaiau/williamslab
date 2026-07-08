import { useCallback, useEffect, useState } from 'react'

// The BrS Theory is shared reference material, not project data, so reading
// progress lives under its own localStorage key (not the per-project store).
const KEY = 'williamslab.theory.read'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set<string>()
  }
}

export function useReadSections() {
  const [read, setRead] = useState<Set<string>>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...read]))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [read])
  const toggle = useCallback(
    (id: string) =>
      setRead((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )
  const clear = useCallback(() => setRead(new Set<string>()), [])
  return { read, toggle, clear }
}
