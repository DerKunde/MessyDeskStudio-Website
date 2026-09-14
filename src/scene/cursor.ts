import './cursor.css'

export type HoverCursor = 'grab' | 'interact'
export type CursorMode  = HoverCursor | 'grabbing' | 'rotating' | null

const MODES = ['grab', 'grabbing', 'rotating', 'interact'] as const

// Mehrere Einträge können gleichzeitig aktiv sein (z. B. verschachtelte Objekte mit eigenem Cursor) –
// Interaktion hat Vorrang vor Greifen, Halten eines Objekts hat Vorrang vor allem
const hovered   = new Map<string, HoverCursor>()
const listeners = new Set<() => void>()
let grabbing    = false
let rotating    = false
let rotatedOnce = false
let mode: CursorMode = null

function apply() {
  const kinds = new Set(hovered.values())
  const next: CursorMode =
    rotating ? 'rotating' :
    grabbing ? 'grabbing' :
    kinds.has('interact') ? 'interact' :
    kinds.has('grab') ? 'grab' : null

  const cl = document.body.classList
  for (const m of MODES) cl.toggle(`cursor-${m}`, m === next)

  if (next === mode) return
  mode = next
  listeners.forEach((l) => l())
}

export const cursor = {
  hover(id: string, kind: HoverCursor) {
    hovered.set(id, kind)
    apply()
  },
  unhover(id: string) {
    if (!hovered.delete(id)) return
    apply()
  },
  setGrabbing(value: boolean) {
    grabbing = value
    if (!value) rotating = false
    apply()
  },
  // Drehen gibt es nur beim Halten – wird beim Loslassen über setGrabbing(false) mit zurückgesetzt
  setRotating(value: boolean) {
    if (rotating === value || (value && !grabbing)) return
    rotating = value
    if (value) rotatedOnce = true
    apply()
  },

  // Für useSyncExternalStore
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  getMode: () => mode,
  hasRotated: () => rotatedOnce,
}
