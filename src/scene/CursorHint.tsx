import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cursor } from './cursor'
import { useInputMode } from '../hooks/useInputMode'
import './CursorHint.css'

// Label neben dem Cursor beim Halten eines Objekts – verschwindet, sobald einmal gedreht wurde,
// außer mit persistent (Tutorial: Hinweis bei jedem Halten)
export function CursorHint({ persistent = false }: { persistent?: boolean }) {
  const inputMode  = useInputMode()
  const mode       = useSyncExternalStore(cursor.subscribe, cursor.getMode)
  const hasRotated = useSyncExternalStore(cursor.subscribe, cursor.hasRotated)
  const ref        = useRef<HTMLDivElement>(null)

  // Position läuft auch unsichtbar mit, damit das Label beim Greifen sofort richtig steht.
  // Nur die Koordinaten kommen per CSS-Variable, alle Styles liegen in CursorHint.css
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
