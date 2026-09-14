import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cursor } from './cursor'
import { useInputMode } from '../hooks/useInputMode'
import './CursorHint.css'

// Label next to the cursor while holding an object – disappears after the first rotation,
// unless persistent (tutorial: hint on every hold)
export function CursorHint({ persistent = false }: { persistent?: boolean }) {
  const inputMode  = useInputMode()
  const mode       = useSyncExternalStore(cursor.subscribe, cursor.getMode)
  const hasRotated = useSyncExternalStore(cursor.subscribe, cursor.hasRotated)
  const ref        = useRef<HTMLDivElement>(null)

  // The position is tracked even while hidden so the label is in place as soon as something is grabbed.
  // Only the coordinates are set via CSS variables, all styles live in CursorHint.css
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      el.style.setProperty('--hint-x', `${e.clientX}px`)
      el.style.setProperty('--hint-y', `${e.clientY}px`)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  if (inputMode !== 'mouse' || (hasRotated && !persistent)) return null

  return createPortal(
    <div ref={ref} className={`cursor-hint${mode === 'grabbing' ? ' cursor-hint--visible' : ''}`}>
      <span className="cursor-hint__key">RMB</span> ↻ drehen
    </div>,
    document.body,
  )
}
