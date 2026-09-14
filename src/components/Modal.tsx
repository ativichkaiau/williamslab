import { cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const headingId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab') {
        const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? [])].filter((el) => el.getClientRects().length)
        const first = items[0], last = items[items.length - 1]
        if (!first) { e.preventDefault(); return }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', h)
    return () => { window.removeEventListener('keydown', h); if (previous?.isConnected) previous.focus() }
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={dialog} tabIndex={-1} className={`modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <div className="modal-head">
          <h3 id={headingId}>{title}</h3>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const labelId = useId()
  const hintId = useId()
  const control = isValidElement(children) && ['input', 'select', 'textarea'].includes(String(children.type))
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { 'aria-labelledby': labelId, ...(hint ? { 'aria-describedby': hintId } : {}) }) : children
  return (
    <label className="field">
      <span id={labelId} className="field-l">{label}</span>
      {control}
      {hint && <span id={hintId} className="field-h">{hint}</span>}
    </label>
  )
}
