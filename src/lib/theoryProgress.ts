import { useStore } from './store'

export function useReadSections() {
  const { state, setTheoryRead } = useStore()
  const read = new Set(state.theoryRead ?? [])
  const toggle = (id: string) => {
    const next = new Set(read)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setTheoryRead(state.project.id, [...next])
  }
  const clear = () => setTheoryRead(state.project.id, [])
  return { read, toggle, clear }
}
