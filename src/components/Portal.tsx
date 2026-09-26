import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Overlays render at the top of the document rather than where they're used.
 *
 * A dialog opened from inside a card must not inherit that card's transform: a
 * transformed ancestor becomes the containing block for position:fixed, so a
 * tilted 3D slab — or a section mid-entrance — would carry its modal with it,
 * pinned to the card instead of the viewport. Portalling makes every overlay
 * viewport-fixed again however deep in the 3D tree it was opened. React context
 * and synthetic events still follow the component tree, so nothing else moves.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
